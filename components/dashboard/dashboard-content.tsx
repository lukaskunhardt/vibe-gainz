"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ExerciseStatus, Movement, MovementCategory } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Trophy, Plus, CheckCircle, Flame } from "lucide-react";
import { format, startOfDay, endOfDay, parseISO, isSameDay, addDays } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { EXERCISE_VARIATIONS, FORM_CUES } from "@/lib/constants/exercises";
import { StatsContent } from "@/components/stats/stats-content";
import { SetCountProgressBar } from "@/components/recording/set-count-progress-bar";
import { useIsDesktop } from "@/lib/hooks/use-media-query";
import { getDailyPrescription } from "@/lib/utils/prescription";

interface DashboardContentProps {
  userId: string;
}

interface CategoryProgress {
  category: MovementCategory;
  currentReps: number;
  completedSets: number;
  prescribedSets: number;
  isLocked: boolean;
  promptPending: boolean;
  hasMaxEffortToday: boolean;
  maxEffortRepsToday?: number;
  previousMaxEffortReps?: number;
  baselineMaxEffortReps?: number;
  movement?: Movement;
  streakDays?: number;
  streakPrevDays?: number;
  exerciseId?: string | null;
  targetReps: number;
}

export function DashboardContent({ userId }: DashboardContentProps) {
  const [progress, setProgress] = useState<CategoryProgress[]>([]);
  const [loading, setLoading] = useState(true);
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
        { data: dailyStatsData },
        { data: statusData },
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
        // Fetch readiness and exercise selections for the selected date
        supabase
          .from("daily_user_stats")
          .select("readiness_score,push_exercise_id,pull_exercise_id,legs_exercise_id")
          .eq("user_id", userId)
          .eq("date", format(selectedDate, "yyyy-MM-dd"))
          .maybeSingle(),
        // Fetch exercise status records
        supabase.from("exercise_status").select("*").eq("user_id", userId),
        // Fetch all max effort sets for all categories (for comparison data)
        supabase
          .from("sets")
          .select("category, reps, logged_at")
          .eq("user_id", userId)
          .eq("is_max_effort", true)
          .order("logged_at", { ascending: true }),
      ]);

      const movementList = (movementsData ?? []) as Movement[];
      const statusList = (statusData ?? []) as ExerciseStatus[];
      const readinessScore =
        dailyStatsData && typeof dailyStatsData.readiness_score === "number"
          ? dailyStatsData.readiness_score
          : null;

      const selectedExercises: Record<MovementCategory, string | null> = {
        push: (dailyStatsData?.push_exercise_id as string | null) ?? null,
        pull: (dailyStatsData?.pull_exercise_id as string | null) ?? null,
        legs: (dailyStatsData?.legs_exercise_id as string | null) ?? null,
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
        const completedSets = sets.filter((s) => !s.is_max_effort).length;
        const exerciseId = selectedExercises[category] || movement?.exercise_variation || null;
        const statusForExercise = exerciseId
          ? statusList.find((status) => status.exercise_id === exerciseId) || null
          : null;
        const currentPR = statusForExercise?.current_pr_reps ?? 0;
        const prescription = getDailyPrescription(readinessScore, currentPR);
        const targetReps = prescription.repsPerSet * prescription.sets;
        const promptPending = Boolean(
          statusForExercise?.prompt_pending && (readinessScore ?? 0) >= 3
        );

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

        return {
          category,
          currentReps,
          targetReps,
          completedSets,
          prescribedSets: prescription.sets,
          isLocked: !movement,
          promptPending,
          hasMaxEffortToday,
          maxEffortRepsToday,
          previousMaxEffortReps,
          baselineMaxEffortReps,
          movement,
          streakDays,
          streakPrevDays,
          exerciseId,
        };
      });

      setProgress(progressData);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
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
          <>
            {/* Interactive title skeleton */}
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-48 animate-pulse rounded bg-muted"></div>
            </div>

            {/* 3 chart skeletons */}
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="mx-auto h-5 w-32 animate-pulse rounded bg-muted"></div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="h-[300px] w-full animate-pulse rounded bg-muted"></div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart options skeleton */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="h-5 w-24 animate-pulse rounded bg-muted"></div>
              <div className="h-5 w-24 animate-pulse rounded bg-muted"></div>
              <div className="h-5 w-20 animate-pulse rounded bg-muted"></div>
              <div className="h-5 w-28 animate-pulse rounded bg-muted"></div>
            </div>
          </>
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
          <MovementCard key={item.category} {...item} isDesktop={isDesktop} />
        ))}
      </div>

      {/* Desktop-only: Render stats below movement cards */}
      {isDesktop && <StatsContent userId={userId} />}
    </div>
  );
}

interface MovementCardProps extends CategoryProgress {
  isDesktop: boolean;
}

function MovementCard({
  category,
  currentReps,
  targetReps,
  completedSets,
  prescribedSets,
  isLocked,
  hasMaxEffortToday,
  maxEffortRepsToday,
  previousMaxEffortReps,
  baselineMaxEffortReps,
  movement,
  streakDays,
  streakPrevDays,
  exerciseId,
  isDesktop,
}: MovementCardProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const isComplete =
    prescribedSets > 0 ? completedSets >= prescribedSets : currentReps >= targetReps;

  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

  const exerciseName = exerciseId
    ? EXERCISE_VARIATIONS[category].find((ex) => ex.id === exerciseId)?.name || exerciseId
    : null;

  const handleCardClick = async () => {
    if (isNavigating) return;
    setIsNavigating(true);

    try {
      if (exerciseId) {
        router.push(`/movement/${category}/record`);
      } else {
        router.push(`/movement/${category}/select-daily`);
      }
    } finally {
      setIsNavigating(false);
    }
  };

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

  // Get the GIF URL for the current exercise
  const gifUrl = exerciseId
    ? FORM_CUES[exerciseId]?.gifUrl
    : movement?.exercise_variation
      ? FORM_CUES[movement.exercise_variation]?.gifUrl
      : undefined;

  return (
    <button
      onClick={handleCardClick}
      disabled={isNavigating}
      className="block w-full text-left transition-opacity disabled:opacity-50"
    >
      <Card
        className={`group relative cursor-pointer overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg ${
          hasMaxEffortToday
            ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
            : isComplete
              ? "border-green-500 bg-green-50 dark:bg-green-950/20"
              : "hover:border-primary/50"
        }`}
      >
        {/* GIF Background on Hover */}
        {gifUrl && (
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-20">
            <Image src={gifUrl} alt="" fill className="object-cover" unoptimized />
          </div>
        )}

        <CardHeader className="relative z-10">
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
            </div>
          </CardTitle>
          <CardDescription className="truncate">
            {exerciseName || "Choose an exercise for today"}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 space-y-4">
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
            <div>
              <SetCountProgressBar
                prescribedSets={prescribedSets}
                completedNonMaxSets={completedSets}
                variant="compact"
              />
            </div>
          )}

          <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 py-2 text-sm font-medium text-primary transition-colors group-hover:border-primary group-hover:bg-primary/10">
            <Plus className="h-4 w-4" />
            <span>{isDesktop ? "Click" : "Tap"} to log set</span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
