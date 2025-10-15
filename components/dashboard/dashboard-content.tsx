"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Movement, MovementCategory, MaxEffortPrompt } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, Trophy, Plus, Info } from "lucide-react";
import { getTodayStart, getTodayEnd, isTodayMonday, getPreviousWeekStart } from "@/lib/utils/date-helpers";
import { MaxEffortPromptModal } from "./max-effort-prompt-modal";
import { EXERCISE_VARIATIONS } from "@/lib/constants/exercises";

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
}

export function DashboardContent({ userId }: DashboardContentProps) {
  const [progress, setProgress] = useState<CategoryProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePrompt, setActivePrompt] = useState<MaxEffortPrompt | null>(null);
  const [needsWeeklyReview, setNeedsWeeklyReview] = useState<MovementCategory[]>([]);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Fetch movements
      const { data: movements } = await supabase
        .from("movements")
        .select("*")
        .eq("user_id", userId);

      // Fetch today's sets
      const todayStart = getTodayStart();
      const todayEnd = getTodayEnd();

      const { data: todaySets } = await supabase
        .from("sets")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", todayStart.toISOString())
        .lte("logged_at", todayEnd.toISOString());

      // Fetch active max effort prompts
      const { data: prompts } = await supabase
        .from("max_effort_prompts")
        .select("*")
        .eq("user_id", userId)
        .eq("dismissed", false)
        .eq("completed", false);

      // Check for weekly reviews
      if (isTodayMonday()) {
        const previousWeekStart = getPreviousWeekStart();
        const { data: reviews } = await supabase
          .from("weekly_reviews")
          .select("category")
          .eq("user_id", userId)
          .eq("week_start_date", previousWeekStart);

        const reviewedCategories = new Set(reviews?.map((r) => r.category) || []);
        const movementCategories = movements?.map((m) => m.category) || [];
        const needsReview = movementCategories.filter((cat) => !reviewedCategories.has(cat));
        setNeedsWeeklyReview(needsReview as MovementCategory[]);
      }

      // Build progress data for each category
      const categories: MovementCategory[] = ["push", "pull", "legs"];
      const progressData: CategoryProgress[] = await Promise.all(
        categories.map(async (category) => {
          const movement = movements?.find((m) => m.category === category);
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
    await supabase
      .from("max_effort_prompts")
      .update({ dismissed: true })
      .eq("id", activePrompt.id);

    setActivePrompt(null);
    loadDashboardData();
  };

  const handlePromptComplete = async () => {
    setActivePrompt(null);
    loadDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Review Banner */}
      {needsWeeklyReview.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Weekly Review Available
            </CardTitle>
            <CardDescription>
              Complete your weekly reviews to update your training targets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {needsWeeklyReview.map((category) => (
                <Link key={category} href={`/weekly-review/${category}`}>
                  <Button variant="default" size="sm">
                    Review {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movement Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {progress.map((item) => (
          <MovementCard key={item.category} {...item} onRefresh={loadDashboardData} />
        ))}
      </div>

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
}: MovementCardProps) {
  const percentage = targetReps > 0 ? Math.min((currentReps / targetReps) * 100, 100) : 0;
  const isComplete = currentReps >= targetReps;

  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  const exerciseName = movement
    ? EXERCISE_VARIATIONS[category].find((ex) => ex.id === movement.exercise_variation)?.name || movement.exercise_variation
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
  const diffFromPrevious = maxEffortRepsToday && previousMaxEffortReps 
    ? maxEffortRepsToday - previousMaxEffortReps 
    : 0;
  const diffFromBaseline = maxEffortRepsToday && baselineMaxEffortReps 
    ? maxEffortRepsToday - baselineMaxEffortReps 
    : 0;

  return (
    <Card className={`relative overflow-hidden ${
      hasMaxEffortToday 
        ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20" 
        : isComplete 
        ? "border-green-500 bg-green-50 dark:bg-green-950/20" 
        : ""
    }`}>
      {hasMaxEffortPrompt && !hasMaxEffortToday && (
        <div className="absolute top-2 right-2">
          <Trophy className="h-6 w-6 text-yellow-500 animate-pulse" />
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{categoryName}</span>
          {hasMaxEffortToday && <Trophy className="h-5 w-5 text-purple-500" />}
          {!hasMaxEffortToday && isComplete && <span className="text-green-500 text-sm font-normal">✓ Complete</span>}
        </CardTitle>
        <CardDescription className="truncate">{exerciseName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasMaxEffortToday ? (
          // Max Effort Indicator
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              <span className="text-lg font-semibold text-purple-700 dark:text-purple-300">Max Effort Test</span>
            </div>
            <div className="text-center py-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <div className="text-4xl font-bold text-purple-700 dark:text-purple-300 mb-2">
                {maxEffortRepsToday} reps
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {diffFromPrevious !== 0 && (
                  <div className={diffFromPrevious > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {diffFromPrevious > 0 ? "+" : ""}{diffFromPrevious} from last test
                  </div>
                )}
                {diffFromBaseline !== 0 && (
                  <div className={diffFromBaseline > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {diffFromBaseline > 0 ? "+" : ""}{diffFromBaseline} from baseline
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
            <div className="flex items-center justify-between mb-2">
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
            <Button className="w-full" variant={isComplete || hasMaxEffortToday ? "outline" : "default"}>
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

