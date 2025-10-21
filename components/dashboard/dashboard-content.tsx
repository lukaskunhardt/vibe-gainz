"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Movement, MovementCategory, MaxEffortPrompt, Set as WorkoutSet } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, Trophy, Plus, Info, CheckCircle, Flame } from "lucide-react";
import { format, startOfDay, endOfDay, parseISO, isSameDay, addDays, subDays } from "date-fns";
import { useSearchParams } from "next/navigation";
import { MaxEffortPromptModal } from "./max-effort-prompt-modal";
import { EXERCISE_VARIATIONS } from "@/lib/constants/exercises";
import { StatsContent } from "@/components/stats/stats-content";
import { useIsDesktop } from "@/lib/hooks/use-media-query";
import { isCapRelaxed, suggestDailyTargetDelta } from "@/lib/utils/recovery-daily";
import { toast } from "sonner";

interface DashboardContentProps {
  userId: string;
}

interface CategoryProgress {
  category: MovementCategory;
  currentReps: number;
  targetReps: number;
  isLocked: boolean;
  hasMaxEffortPrompt: boolean;
  hasMaxEffortToday: boolean;
  maxEffortRepsToday?: number;
  previousMaxEffortReps?: number;
  baselineMaxEffortReps?: number;
  movement?: Movement;
  streakDays?: number;
  streakPrevDays?: number;
}

export function DashboardContent({ userId }: DashboardContentProps) {
  const [progress, setProgress] = useState<CategoryProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePrompt, setActivePrompt] = useState<MaxEffortPrompt | null>(null);
  // Weekly reviews removed
  const isDesktop = useIsDesktop();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const selectedDate = dateParam ? parseISO(dateParam) : new Date();

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dateParam]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);

      // OPTIMIZATION: Parallelize ALL initial queries with Promise.all()
      const [
        { data: movementsData },
        { data: todaySets },
        { data: prompts },
        { data: allTargetHistory },
        { data: allMaxEffortSets },
      ] = await Promise.all([
        // Fetch movements
        supabase.from("movements").select("*").eq("user_id", userId),
        // Fetch sets for selected day
        supabase
          .from("sets")
          .select("*")
          .eq("user_id", userId)
          .gte("logged_at", dayStart.toISOString())
          .lte("logged_at", dayEnd.toISOString()),
        // Fetch active max effort prompts
        supabase
          .from("max_effort_prompts")
          .select("*")
          .eq("user_id", userId)
          .eq("dismissed", false)
          .eq("completed", false),
        // Fetch ALL target history once (no more per-movement queries!)
        supabase
          .from("movement_target_history")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false }),
        // Fetch all max effort sets for all categories (for comparison data)
        supabase
          .from("sets")
          .select("category, reps, logged_at")
          .eq("user_id", userId)
          .eq("is_max_effort", true)
          .order("logged_at", { ascending: true }),
      ]);

      const movementList = (movementsData ?? []) as Movement[];

      // OPTIMIZATION: In-memory target history lookup (no more DB queries!)
      const targetHistoryByMovement = new Map<string, Array<{ date: string; target: number }>>();
      (allTargetHistory ?? []).forEach((entry) => {
        if (!targetHistoryByMovement.has(entry.movement_id)) {
          targetHistoryByMovement.set(entry.movement_id, []);
        }
        targetHistoryByMovement.get(entry.movement_id)!.push({
          date: entry.date,
          target: entry.target,
        });
      });

      const getHistoricalTargetFromMemory = (movementId: string, date: Date): number | null => {
        const dateStr = format(date, "yyyy-MM-dd");
        const history = targetHistoryByMovement.get(movementId);
        if (!history) return null;

        // Find most recent target <= date
        for (const entry of history) {
          if (entry.date <= dateStr) {
            return entry.target;
          }
        }
        return null;
      };

      // Group max effort sets by category for fast lookup
      const maxEffortByCategory = new Map<
        MovementCategory,
        Array<{ reps: number; logged_at: string }>
      >();
      (allMaxEffortSets ?? []).forEach((set) => {
        const cat = set.category as MovementCategory;
        if (!maxEffortByCategory.has(cat)) {
          maxEffortByCategory.set(cat, []);
        }
        maxEffortByCategory.get(cat)!.push({ reps: set.reps, logged_at: set.logged_at });
      });

      // OPTIMIZATION: Parallelize streak RPC calls for all 3 categories
      const categories: MovementCategory[] = ["push", "pull", "legs"];
      const isToday = isSameDay(dayStart, startOfDay(new Date()));

      const streakPromises = categories.flatMap((category) => {
        const promises = [
          supabase.rpc("get_category_streak", {
            p_category: category,
            p_target_date: format(dayStart, "yyyy-MM-dd"),
          }),
        ];
        if (isToday) {
          promises.push(
            supabase.rpc("get_category_streak", {
              p_category: category,
              p_target_date: format(addDays(dayStart, -1), "yyyy-MM-dd"),
            })
          );
        }
        return promises;
      });

      const streakResults = await Promise.all(streakPromises);

      // Parse streak results
      const streakData = new Map<MovementCategory, { current: number; prev?: number }>();
      categories.forEach((category, idx) => {
        const currentStreakIdx = isToday ? idx * 2 : idx;
        const prevStreakIdx = isToday ? idx * 2 + 1 : -1;

        const currentStreak =
          typeof streakResults[currentStreakIdx]?.data === "number"
            ? streakResults[currentStreakIdx].data
            : 0;
        const prevStreak =
          prevStreakIdx >= 0 && typeof streakResults[prevStreakIdx]?.data === "number"
            ? streakResults[prevStreakIdx].data
            : undefined;

        streakData.set(category, { current: currentStreak, prev: prevStreak });
      });

      // Build progress data (now all queries are done, just processing!)
      const progressData: CategoryProgress[] = categories.map((category) => {
        const movement = movementList.find((m) => m.category === category);
        const sets = todaySets?.filter((s) => s.category === category) || [];
        const currentReps = sets.reduce((sum, set) => sum + set.reps, 0);
        const prompt = prompts?.find((p) => p.category === category);

        // Check if max effort was performed today
        const maxEffortSetToday = sets.find((s) => s.is_max_effort);
        const hasMaxEffortToday = !!maxEffortSetToday;
        const maxEffortRepsToday = maxEffortSetToday?.reps;

        let previousMaxEffortReps: number | undefined;
        let baselineMaxEffortReps: number | undefined;

        // Get max effort comparison data from memory
        if (hasMaxEffortToday && movement) {
          const allMaxEffort = maxEffortByCategory.get(category) ?? [];
          if (allMaxEffort.length > 0) {
            baselineMaxEffortReps = allMaxEffort[0].reps;
            if (allMaxEffort.length > 1) {
              previousMaxEffortReps = allMaxEffort[allMaxEffort.length - 2].reps;
            } else {
              previousMaxEffortReps = baselineMaxEffortReps;
            }
          }
        }

        // Get streak data from memory
        const streak = streakData.get(category);
        const streakDays = streak?.current ?? 0;
        const streakPrevDays = streak?.prev;

        // Get target from memory
        let targetReps = 0;
        if (movement) {
          const historicalTarget = getHistoricalTargetFromMemory(movement.id, selectedDate);
          if (historicalTarget !== null) {
            targetReps = historicalTarget;
          }
        }

        return {
          category,
          currentReps,
          targetReps,
          isLocked: !movement,
          hasMaxEffortPrompt: !!prompt,
          hasMaxEffortToday,
          maxEffortRepsToday,
          previousMaxEffortReps,
          baselineMaxEffortReps,
          movement,
          streakDays,
          streakPrevDays,
        };
      });

      setProgress(progressData);

      // Set first active prompt as modal
      if (prompts && prompts.length > 0) {
        setActivePrompt(prompts[0]);
      }

      // OPTIMIZATION: Run auto-adjustment async in background (don't block render!)
      runAutoAdjustment(movementList, supabase);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // OPTIMIZATION: Auto-adjustment runs async, doesn't block dashboard
  const runAutoAdjustment = async (
    movementList: Movement[],
    supabase: ReturnType<typeof createClient>
  ) => {
    try {
      const today = new Date();
      const todayStart = startOfDay(today);
      const yesterday = subDays(today, 1);
      const yesterdayStart = startOfDay(yesterday);
      const yesterdayEnd = endOfDay(yesterday);
      const dayMinus2 = subDays(today, 2);
      const dayMinus2Start = startOfDay(dayMinus2);

      // Fetch last two days of sets and readiness in parallel
      const [{ data: recentSets }, { data: readiness }] = await Promise.all([
        supabase
          .from("sets")
          .select("*")
          .eq("user_id", userId)
          .gte("logged_at", dayMinus2Start.toISOString())
          .lte("logged_at", yesterdayEnd.toISOString())
          .order("logged_at", { ascending: true }),
        supabase
          .from("readiness")
          .select("score")
          .eq("user_id", userId)
          .eq(
            "date",
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
          )
          .single(),
      ]);

      const recentWorkoutSets = (recentSets ?? []) as WorkoutSet[];
      const yKey = format(yesterdayStart, "yyyy-MM-dd");
      const d2Key = format(dayMinus2Start, "yyyy-MM-dd");

      // Helper: group sets by category and date
      const byCatDate = new Map<MovementCategory, Map<string, WorkoutSet[]>>();
      recentWorkoutSets.forEach((s) => {
        const d = new Date(s.logged_at);
        d.setHours(0, 0, 0, 0);
        const key = format(d, "yyyy-MM-dd");
        const cat = s.category as MovementCategory;
        if (!byCatDate.has(cat)) byCatDate.set(cat, new Map());
        const inner = byCatDate.get(cat)!;
        if (!inner.has(key)) inner.set(key, []);
        inner.get(key)!.push(s);
      });

      // Fetch all current targets in parallel
      const targetQueries = movementList.map((m) =>
        supabase
          .from("movement_target_history")
          .select("target")
          .eq("movement_id", m.id)
          .lte("date", format(yesterdayStart, "yyyy-MM-dd"))
          .order("date", { ascending: false })
          .limit(1)
      );
      const targetResults = await Promise.all(targetQueries);

      for (let i = 0; i < movementList.length; i++) {
        const m = movementList[i];
        const updatedAt = m.updated_at ? new Date(m.updated_at) : undefined;
        if (updatedAt && updatedAt >= todayStart) continue;

        const cat = m.category;
        const ySets = byCatDate.get(cat)?.get(yKey) ?? [];
        const d2Sets = byCatDate.get(cat)?.get(d2Key);
        const currentTarget = targetResults[i]?.data?.[0]?.target ?? 0;

        const capOk = isCapRelaxed(ySets, d2Sets);
        const readinessScore = readiness?.score ?? 3;
        const suggestion = suggestDailyTargetDelta(
          ySets,
          currentTarget,
          capOk,
          m.category,
          readinessScore
        );

        if (suggestion.delta !== 0) {
          const nextTarget = Math.max(1, currentTarget + suggestion.delta);
          const effectiveDate = format(todayStart, "yyyy-MM-dd");
          const { error } = await supabase.from("movement_target_history").upsert(
            {
              user_id: userId,
              movement_id: m.id,
              category: m.category,
              date: effectiveDate,
              target: nextTarget,
            },
            { onConflict: "movement_id,date" }
          );
          if (!error) {
            await supabase
              .from("movements")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", m.id);
            toast.success(
              `${cat.charAt(0).toUpperCase() + cat.slice(1)} target: ${currentTarget} → ${nextTarget} (${suggestion.reason})`
            );
          }
        }
      }
    } catch {
      // Ignore auto-adjust errors
    }
  };

  const handlePromptDismiss = async () => {
    if (!activePrompt) return;

    const supabase = createClient();
    await supabase.from("max_effort_prompts").update({ dismissed: true }).eq("id", activePrompt.id);

    setActivePrompt(null);
    loadDashboardData();
  };

  const handlePromptComplete = async () => {
    setActivePrompt(null);
    loadDashboardData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton for 3 movement cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="h-6 w-16 animate-pulse rounded bg-muted"></div>
                  <div className="h-5 w-5 animate-pulse rounded bg-muted"></div>
                </div>
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-muted"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="h-8 w-24 animate-pulse rounded bg-muted"></div>
                    <div className="h-4 w-12 animate-pulse rounded bg-muted"></div>
                  </div>
                  <div className="h-2 w-full animate-pulse rounded-full bg-muted"></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-10 w-full animate-pulse rounded-md bg-muted"></div>
                  <div className="h-10 w-full animate-pulse rounded-md bg-muted"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop stats skeleton */}
        {isDesktop && (
          <Card>
            <CardHeader>
              <div className="h-7 w-48 animate-pulse rounded bg-muted"></div>
              <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted"></div>
            </CardHeader>
            <CardContent>
              <div className="h-[360px] w-full animate-pulse rounded bg-muted"></div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Review Banner removed */}

      {/* Movement Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {progress.map((item) => (
          <MovementCard key={item.category} {...item} onRefresh={loadDashboardData} />
        ))}
      </div>

      {/* Desktop-only: Render stats below movement cards */}
      {isDesktop && <StatsContent userId={userId} />}

      {/* Max Effort Prompt Modal */}
      {activePrompt && (
        <MaxEffortPromptModal
          prompt={activePrompt}
          onDismiss={handlePromptDismiss}
          onComplete={handlePromptComplete}
        />
      )}
    </div>
  );
}

interface MovementCardProps extends CategoryProgress {
  onRefresh: () => void;
}

function MovementCard({
  category,
  currentReps,
  targetReps,
  isLocked,
  hasMaxEffortPrompt,
  hasMaxEffortToday,
  maxEffortRepsToday,
  previousMaxEffortReps,
  baselineMaxEffortReps,
  movement,
  streakDays,
  streakPrevDays,
}: MovementCardProps) {
  const percentage = targetReps > 0 ? Math.min((currentReps / targetReps) * 100, 100) : 0;
  const isComplete = currentReps >= targetReps;

  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  const exerciseName = movement
    ? EXERCISE_VARIATIONS[category].find((ex) => ex.id === movement.exercise_variation)?.name ||
      movement.exercise_variation
    : "";

  if (isLocked) {
    return (
      <Card className="relative overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{categoryName}</span>
            <Lock className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
          <CardDescription>Not yet configured</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/movement/${category}/select`}>
            <Button className="w-full" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Set Up Movement
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Calculate differences for max effort indicator
  const diffFromPrevious =
    maxEffortRepsToday && previousMaxEffortReps ? maxEffortRepsToday - previousMaxEffortReps : 0;
  const diffFromBaseline =
    maxEffortRepsToday && baselineMaxEffortReps ? maxEffortRepsToday - baselineMaxEffortReps : 0;

  return (
    <Card
      className={`relative overflow-hidden ${
        hasMaxEffortToday
          ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
          : isComplete
            ? "border-green-500 bg-green-50 dark:bg-green-950/20"
            : ""
      }`}
    >
      {hasMaxEffortPrompt && !hasMaxEffortToday && (
        <div className="absolute right-2 top-2">
          <Trophy className="h-6 w-6 animate-pulse text-yellow-500" />
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{categoryName}</span>
          <div className="flex items-center gap-2">
            {(() => {
              const hasAnySetToday = currentReps > 0;
              const showArrow =
                typeof streakPrevDays === "number" && !hasAnySetToday && streakPrevDays > 0;
              const realized = typeof streakDays === "number" ? streakDays : 0;
              const potential = typeof streakPrevDays === "number" ? streakPrevDays + 1 : 0;
              const shouldShowChip = showArrow || realized > 0;
              if (!shouldShowChip) return null;

              const base = "text-xs rounded border px-1.5 py-0.5 flex items-center gap-1";
              const done =
                "text-green-600 dark:text-green-400 border-green-300/50 dark:border-green-700/50";
              const prog =
                "text-amber-600 dark:text-amber-400 border-amber-300/50 dark:border-amber-700/50";

              if (isComplete && realized > 0) {
                return (
                  <span className={`${base} ${done}`}>
                    <CheckCircle className="h-4 w-4" />
                    {realized} Day Streak
                  </span>
                );
              }

              return (
                <span className={`${base} ${prog}`}>
                  <Flame className="h-4 w-4" />
                  {showArrow ? (
                    <>
                      {streakPrevDays} → {potential} Day Streak
                    </>
                  ) : (
                    <>{realized} Day Streak</>
                  )}
                </span>
              );
            })()}
            {hasMaxEffortToday && <Trophy className="h-5 w-5 text-purple-500" />}
          </div>
        </CardTitle>
        <CardDescription className="truncate">{exerciseName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasMaxEffortToday ? (
          // Max Effort Indicator
          <div className="space-y-2">
            <div className="mb-2 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              <span className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                Max Effort Test
              </span>
            </div>
            <div className="rounded-lg bg-purple-100 py-4 text-center dark:bg-purple-900/30">
              <div className="mb-2 text-4xl font-bold text-purple-700 dark:text-purple-300">
                {maxEffortRepsToday} reps
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {diffFromPrevious !== 0 && (
                  <div
                    className={
                      diffFromPrevious > 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  >
                    {diffFromPrevious > 0 ? "+" : ""}
                    {diffFromPrevious} from last test
                  </div>
                )}
                {diffFromBaseline !== 0 && (
                  <div
                    className={
                      diffFromBaseline > 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  >
                    {diffFromBaseline > 0 ? "+" : ""}
                    {diffFromBaseline} from baseline
                  </div>
                )}
                {diffFromPrevious === 0 && diffFromBaseline === 0 && (
                  <div className="text-muted-foreground">First max effort test!</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Normal Progress Bar
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-2xl font-bold">
                {currentReps} / {targetReps}
              </span>
              <span className="text-sm text-muted-foreground">{Math.round(percentage)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link href={`/movement/${category}/record`} prefetch={true}>
            <Button
              className="w-full"
              variant={isComplete || hasMaxEffortToday ? "outline" : "default"}
            >
              <Plus className="mr-2 h-4 w-4" />
              Log Set
            </Button>
          </Link>
          <Link href={`/movement/${category}/${movement?.exercise_variation}/info`} prefetch={true}>
            <Button className="w-full" variant="outline">
              <Info className="mr-2 h-4 w-4" />
              Info
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
