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

      // Fetch movements
      const { data: movementsData } = await supabase
        .from("movements")
        .select("*")
        .eq("user_id", userId);
      let movementList = (movementsData ?? []) as Movement[];

      // Auto-adjust daily targets once per day based on yesterday's performance
      try {
        const today = new Date();
        const todayStart = startOfDay(today);
        const yesterday = subDays(today, 1);
        const yesterdayStart = startOfDay(yesterday);
        const yesterdayEnd = endOfDay(yesterday);
        const dayMinus2 = subDays(today, 2);
        const dayMinus2Start = startOfDay(dayMinus2);

        // Fetch last two days of sets for all categories (non-destructive read)
        const { data: recentSets } = await supabase
          .from("sets")
          .select("*")
          .eq("user_id", userId)
          .gte("logged_at", dayMinus2Start.toISOString())
          .lte("logged_at", yesterdayEnd.toISOString())
          .order("logged_at", { ascending: true });
        const recentWorkoutSets = (recentSets ?? []) as WorkoutSet[];

        // Fetch today's readiness (gate increases)
        const ytd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const { data: readiness } = await supabase
          .from("readiness")
          .select("score")
          .eq("user_id", userId)
          .eq("date", ytd)
          .single();

        const yKey = format(yesterdayStart, "yyyy-MM-dd");
        const d2Key = format(dayMinus2Start, "yyyy-MM-dd");

        // Helper: group sets by category and date (local day key)
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

        let anyUpdated = false;
        for (const m of movementList) {
          // Only adjust once per calendar day
          const updatedAt = m.updated_at ? new Date(m.updated_at) : undefined;
          if (updatedAt && updatedAt >= todayStart) continue;

          const cat = m.category;
          const ySets = byCatDate.get(cat)?.get(yKey) ?? [];
          const d2Sets = byCatDate.get(cat)?.get(d2Key);

          const capOk = isCapRelaxed(ySets, d2Sets);
          const readinessScore = readiness?.score ?? 3;
          const suggestion = suggestDailyTargetDelta(
            ySets,
            m.daily_target,
            capOk,
            m.category,
            readinessScore
          );

          if (suggestion.delta !== 0) {
            const nextTarget = Math.max(1, m.daily_target + suggestion.delta);
            const { error } = await supabase
              .from("movements")
              .update({ daily_target: nextTarget, updated_at: new Date().toISOString() })
              .eq("id", m.id);
            if (!error) {
              const effectiveDate = format(todayStart, "yyyy-MM-dd");
              await supabase.from("movement_target_history").upsert(
                {
                  user_id: userId,
                  movement_id: m.id,
                  category: m.category,
                  date: effectiveDate,
                  target: nextTarget,
                },
                { onConflict: "movement_id,date" }
              );
              anyUpdated = true;
              toast.success(
                `${cat.charAt(0).toUpperCase() + cat.slice(1)} target: ${m.daily_target} → ${nextTarget} (${suggestion.reason})`
              );
            }
          }
        }

        // Re-fetch movements if any target was updated
        if (anyUpdated) {
          const refetch = await supabase.from("movements").select("*").eq("user_id", userId);
          movementList = (refetch.data ?? movementList) as Movement[];
        }
      } catch {
        // Ignore auto-adjust errors to avoid blocking dashboard load
      }

      // Fetch sets for selected day
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);

      const { data: todaySets } = await supabase
        .from("sets")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", dayStart.toISOString())
        .lte("logged_at", dayEnd.toISOString());

      // Fetch active max effort prompts
      const { data: prompts } = await supabase
        .from("max_effort_prompts")
        .select("*")
        .eq("user_id", userId)
        .eq("dismissed", false)
        .eq("completed", false);

      // Weekly reviews removed

      // Build progress data for each category
      const categories: MovementCategory[] = ["push", "pull", "legs"];
      const progressData: CategoryProgress[] = await Promise.all(
        categories.map(async (category) => {
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

          // If max effort was performed today, fetch comparison data
          if (hasMaxEffortToday && movement) {
            // Get all max effort sets for this category
            const { data: allMaxEffortSets } = await supabase
              .from("sets")
              .select("reps, logged_at")
              .eq("user_id", userId)
              .eq("category", category)
              .eq("is_max_effort", true)
              .order("logged_at", { ascending: true });

            if (allMaxEffortSets && allMaxEffortSets.length > 0) {
              // Baseline is the first max effort ever
              baselineMaxEffortReps = allMaxEffortSets[0].reps;

              // Previous is the second-to-last max effort (if exists)
              if (allMaxEffortSets.length > 1) {
                previousMaxEffortReps = allMaxEffortSets[allMaxEffortSets.length - 2].reps;
              } else {
                // If only one max effort exists (today's), use baseline as previous
                previousMaxEffortReps = baselineMaxEffortReps;
              }
            }
          }

          // Compute streak for this category as of selected day (inclusive)
          let streakDays = 0;
          let streakPrevDays: number | undefined = undefined;
          try {
            const { data: streakValue } = await supabase.rpc("get_category_streak", {
              p_category: category,
              p_target_date: format(dayStart, "yyyy-MM-dd"),
            });
            if (typeof streakValue === "number") {
              streakDays = streakValue;
            }
            // If viewing today, also compute yesterday's streak for preview
            if (isSameDay(dayStart, startOfDay(new Date()))) {
              const { data: streakPrev } = await supabase.rpc("get_category_streak", {
                p_category: category,
                p_target_date: format(addDays(dayStart, -1), "yyyy-MM-dd"),
              });
              if (typeof streakPrev === "number") {
                streakPrevDays = streakPrev;
              }
            }
          } catch {}

          return {
            category,
            currentReps,
            targetReps: movement?.daily_target || 0,
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
        })
      );

      setProgress(progressData);

      // Set first active prompt as modal
      if (prompts && prompts.length > 0) {
        setActivePrompt(prompts[0]);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
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
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
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
          <Link href={`/movement/${category}/record`}>
            <Button
              className="w-full"
              variant={isComplete || hasMaxEffortToday ? "outline" : "default"}
            >
              <Plus className="mr-2 h-4 w-4" />
              Log Set
            </Button>
          </Link>
          <Link href={`/movement/${category}/${movement?.exercise_variation}/info`}>
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
