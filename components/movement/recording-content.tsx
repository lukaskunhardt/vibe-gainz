"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MovementCategory, Set as WorkoutSet } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { calculateInitialDailyTarget, shouldAutoProgress } from "@/lib/utils/calculations";
import { EnhancedProgressBar } from "@/components/recording/enhanced-progress-bar";
import { SetLoggingModal } from "@/components/recording/set-logging-modal";
import { CompletedSetsList } from "@/components/recording/completed-sets-list";
import { updateSet, deleteSet } from "@/lib/hooks/use-sets";
import { EXERCISE_VARIATIONS, getExerciseById } from "@/lib/constants/exercises";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RecordingContentProps {
  userId: string;
  category: MovementCategory;
  isMaxEffort: boolean;
  initialExercise?: string;
}

export function RecordingContent({
  userId,
  category,
  isMaxEffort,
  initialExercise,
}: RecordingContentProps) {
  const router = useRouter();
  const [movement, setMovement] = useState<{
    id: string;
    exercise_variation: string;
    max_effort_reps: number;
  } | null>(null);
  const [currentTarget, setCurrentTarget] = useState<number>(0);
  const [todaySets, setTodaySets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true); // Initial page load only
  const [isRefreshing, setIsRefreshing] = useState(false); // Post-action data refresh
  const [lastBestSet, setLastBestSet] = useState<number>(0);
  const [yesterdayTarget, setYesterdayTarget] = useState<number | undefined>(undefined);
  const [readinessScore, setReadinessScore] = useState<number | null | undefined>(undefined);
  const [yesterdaySummary, setYesterdaySummary] = useState<
    { setsCount: number; avgRPE: number; reached: boolean } | null | undefined
  >(undefined);

  // Modal state
  const [showSetModal, setShowSetModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingSet, setEditingSet] = useState<WorkoutSet | null>(null);

  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [setToDelete, setSetToDelete] = useState<string | null>(null);

  // Calculate recommended sets based on daily target and last best set
  const calculateRecommendedSets = (dailyTarget: number, lastBestSetReps: number): number[] => {
    if (lastBestSetReps === 0 || dailyTarget === 0) return [dailyTarget];
    const sets: number[] = [];
    let remaining = dailyTarget;
    while (remaining > 0) {
      const nextSet = Math.min(lastBestSetReps, remaining);
      sets.push(nextSet);
      remaining -= nextSet;
    }
    return sets;
  };

  useEffect(() => {
    loadData(true); // Initial load with skeleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, category]);

  const loadData = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const supabase = createClient();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Calculate yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
      const yesterdayStart = new Date(yesterday);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      // OPTIMIZATION: Parallelize all queries
      const [
        { data: movementData },
        { data: dailyStatsData },
        { data: targetData },
        { data: setsData },
        { data: lastSessionSets },
        { data: yesterdayTargetData },
        { data: readinessData },
        { data: yesterdaySetsData },
      ] = await Promise.all([
        // Fetch movement
        supabase
          .from("movements")
          .select("*")
          .eq("user_id", userId)
          .eq("category", category)
          .single(),
        // Fetch today's daily stats (for exercise selection)
        supabase
          .from("daily_user_stats")
          .select(`${category}_exercise_id`)
          .eq("user_id", userId)
          .eq("date", todayStr)
          .maybeSingle(),
        // Fetch current target from history
        supabase
          .from("movement_target_history")
          .select("target")
          .eq("user_id", userId)
          .eq("category", category)
          .lte("date", todayStr)
          .order("date", { ascending: false })
          .limit(1),
        // Fetch today's sets
        supabase
          .from("sets")
          .select("*")
          .eq("user_id", userId)
          .eq("category", category)
          .gte("logged_at", todayStart.toISOString())
          .lte("logged_at", todayEnd.toISOString())
          .order("set_number", { ascending: true }),
        // Fetch last session's sets to find best set
        supabase
          .from("sets")
          .select("reps")
          .eq("user_id", userId)
          .eq("category", category)
          .eq("is_max_effort", false)
          .lt("logged_at", todayStart.toISOString())
          .order("logged_at", { ascending: false })
          .limit(20),
        // Fetch yesterday's target from history
        supabase
          .from("movement_target_history")
          .select("target")
          .eq("user_id", userId)
          .eq("category", category)
          .eq("date", yesterdayStr),
        // Fetch today's readiness score
        supabase
          .from("daily_user_stats")
          .select("readiness_score")
          .eq("user_id", userId)
          .eq("date", todayStr)
          .maybeSingle(),
        // Fetch yesterday's sets for summary calculation
        supabase
          .from("sets")
          .select("reps, rpe, is_max_effort, set_number")
          .eq("user_id", userId)
          .eq("category", category)
          .gte("logged_at", yesterdayStart.toISOString())
          .lte("logged_at", yesterdayEnd.toISOString())
          .order("set_number", { ascending: true }),
      ]);

      // Get today's exercise selection from daily_user_stats
      const exerciseField = `${category}_exercise_id`;
      const todayExercise = dailyStatsData
        ? (dailyStatsData as Record<string, string | null>)[exerciseField as string]
        : null;

      // If no daily exercise selected, redirect to selection page
      if (!todayExercise && !isMaxEffort) {
        toast.error("Please select an exercise for today first.");
        router.push(`/movement/${category}/select-daily`);
        return;
      }

      // If no movement exists and we're in max effort mode with initialExercise, allow it
      if (!movementData) {
        if (isMaxEffort && initialExercise) {
          // No movement yet - this is initial setup
          // Set a temporary movement structure with the selected exercise
          setMovement({
            id: "", // Will be created when saving
            exercise_variation: initialExercise,
            max_effort_reps: 0,
          });
          setCurrentTarget(0);
        } else {
          toast.error("Movement not configured. Please set it up first.");
          router.push(`/movement/${category}/select`);
          return;
        }
      }

      let target = 0;
      if (movementData) {
        // Use today's exercise selection instead of movement.exercise_variation
        const effectiveExercise = todayExercise || movementData.exercise_variation;
        setMovement({
          ...movementData,
          exercise_variation: effectiveExercise,
        });
        target = targetData?.[0]?.target ?? 0;
        setCurrentTarget(target);
      }

      setTodaySets(setsData || []);

      // Calculate last best set from previous sessions
      const calculatedLastBestSet = lastSessionSets?.length
        ? Math.max(...lastSessionSets.map((s) => s.reps))
        : movementData
          ? Math.floor(movementData.max_effort_reps * 0.8)
          : 0;
      setLastBestSet(calculatedLastBestSet);

      // Process yesterday's target
      const yesterdayTargetValue = yesterdayTargetData?.[0]?.target;
      setYesterdayTarget(yesterdayTargetValue);

      // Process readiness score
      const readinessValue = readinessData?.readiness_score ?? null;
      setReadinessScore(readinessValue);

      // Calculate yesterday's summary
      if (yesterdaySetsData && yesterdaySetsData.length > 0 && yesterdayTargetValue !== undefined) {
        const nonMaxSets = yesterdaySetsData.filter((s) => !s.is_max_effort);
        if (nonMaxSets.length > 0) {
          const totalReps = nonMaxSets.reduce((sum, s) => sum + s.reps, 0);
          const avgRPE = nonMaxSets.reduce((sum, s) => sum + s.rpe, 0) / nonMaxSets.length;
          const reached = totalReps >= yesterdayTargetValue;
          setYesterdaySummary({
            setsCount: nonMaxSets.length,
            avgRPE,
            reached,
          });
        } else {
          setYesterdaySummary(null);
        }
      } else {
        setYesterdaySummary(null);
      }

      // No need to prefill reps - modal will handle this
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  const handleLogNewSet = () => {
    setModalMode("create");
    setEditingSet(null);
    setShowSetModal(true);
  };

  const handleEditSet = (set: WorkoutSet) => {
    setModalMode("edit");
    setEditingSet(set);
    setShowSetModal(true);
  };

  const handleDeleteSet = (setId: string) => {
    setSetToDelete(setId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteSet = async () => {
    if (!setToDelete) return;

    setIsRefreshing(true);
    try {
      const result = await deleteSet(setToDelete, userId, category, new Date());

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("Set deleted successfully");
      await loadData(false);
    } catch (error) {
      console.error("Error deleting set:", error);
      toast.error("Failed to delete set. Please try again.");
    } finally {
      setIsRefreshing(false);
      setShowDeleteDialog(false);
      setSetToDelete(null);
    }
  };


  const handleSaveSet = async (reps: number, rpe: number, isMaxEffortSet: boolean) => {
    if (!movement) return;

    // Handle edit mode
    if (modalMode === "edit" && editingSet) {
      setIsRefreshing(true);
      try {
        const result = await updateSet(editingSet.id, { reps, rpe });

        if (!result.success) {
          throw new Error(result.error);
        }

        toast.success("Set updated successfully");
        await loadData(false);
      } catch (error) {
        console.error("Error updating set:", error);
        toast.error("Failed to update set. Please try again.");
      } finally {
        setIsRefreshing(false);
      }
      return;
    }

    // Handle create mode
    await saveSet(reps, rpe, isMaxEffortSet);
  };

  const saveSet = async (reps: number, rpe: number, isMaxEffortSet: boolean) => {
    if (!movement) return;

    setIsRefreshing(true);
    try {
      const supabase = createClient();
      let movementId = movement.id;

      // Insert new set
      const setNumber = todaySets.length + 1;

      // If max effort and movement doesn't exist yet (initial setup), create it first
      if ((isMaxEffortSet || isMaxEffort) && !movement.id) {
        const newDailyTarget = calculateInitialDailyTarget(reps);

        const { data: newMovement, error: createError } = await supabase
          .from("movements")
          .insert({
            user_id: userId,
            category,
            exercise_variation: movement.exercise_variation,
            max_effort_reps: reps,
            max_effort_date: new Date().toISOString(),
            is_unlocked: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        if (newMovement) {
          movementId = newMovement.id;
          setMovement(newMovement);

          // Insert initial target into history
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          await supabase.from("movement_target_history").insert({
            user_id: userId,
            movement_id: newMovement.id,
            category,
            date: todayStr,
            target: newDailyTarget,
          });
          setCurrentTarget(newDailyTarget);
        }
      }

      // Insert set
      const { error: setError } = await supabase.from("sets").insert({
        user_id: userId,
        movement_id: movementId || null,
        category,
        exercise_variation: movement.exercise_variation,
        reps,
        rpe,
        is_max_effort: isMaxEffortSet || isMaxEffort,
        set_number: setNumber,
        logged_at: new Date().toISOString(),
      });

      if (setError) throw setError;

      // If max effort and movement already exists, update it
      if ((isMaxEffortSet || isMaxEffort) && movement.id) {
        const newDailyTarget = calculateInitialDailyTarget(reps);
        const exercise = getExerciseById(movement.exercise_variation);

        // Check for auto-progression
        let nextExercise = null;
        if (exercise && !exercise.isStandard && reps > 20) {
          nextExercise = shouldAutoProgress(exercise, reps, category);
        }

        const updateData: Record<string, string | number> = {
          max_effort_reps: reps,
          max_effort_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (nextExercise) {
          updateData.exercise_variation = nextExercise.id;
          toast.success(`Great job! Auto-progressed to ${nextExercise.name}`);
        }

        const { error: updateError } = await supabase
          .from("movements")
          .update(updateData)
          .eq("id", movement.id);

        if (updateError) throw updateError;

        // Insert new target into history
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        await supabase.from("movement_target_history").upsert(
          {
            user_id: userId,
            movement_id: movement.id,
            category,
            date: todayStr,
            target: newDailyTarget,
          },
          { onConflict: "movement_id,date" }
        );
        setCurrentTarget(newDailyTarget);

        // Mark max effort prompt as completed if exists
        await supabase
          .from("max_effort_prompts")
          .update({ completed: true })
          .eq("user_id", userId)
          .eq("category", category)
          .eq("completed", false);

        toast.success(`Max effort recorded: ${reps} reps! New target: ${newDailyTarget} reps/day`);
      } else {
        toast.success(`Set ${setNumber} logged: ${reps} reps @ RPE ${rpe}`);
      }

      // Check if daily target is reached before reloading
      const newTotal = todaySets.reduce((sum, s) => sum + s.reps, 0) + reps;
      const targetToCheck =
        (isMaxEffortSet || isMaxEffort) && !movement.id
          ? calculateInitialDailyTarget(reps)
          : currentTarget;

      // For max effort sets, always redirect to dashboard
      if (isMaxEffortSet || isMaxEffort) {
        toast.success("🎉 Max effort recorded! Check the dashboard.");
        setTimeout(() => router.push("/dashboard"), 1500);
        return; // Exit early
      } else if (newTotal >= targetToCheck) {
        // Small delay to ensure DB transaction completes, then reload data
        await new Promise((resolve) => setTimeout(resolve, 100));
        await loadData(false); // Refresh without skeleton to show animation
        toast.success("🎉 Daily target reached! Great work!");
        // Wait longer to allow animation to play (animation is 800ms + extra time to see it)
        setTimeout(() => router.push("/dashboard"), 2500);
        return; // Exit early
      }

      // Reload data
      await loadData(false); // Refresh without skeleton
    } catch (error) {
      console.error("Error saving set:", error);
      toast.error("Failed to save set. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        {/* Back button skeleton */}
        <div className="mb-6">
          <div className="h-9 w-40 animate-pulse rounded-md bg-muted"></div>
        </div>

        <Card>
          <CardHeader>
            {/* Title skeleton */}
            <div className="h-8 w-56 animate-pulse rounded bg-muted"></div>
            {/* Description skeleton */}
            <div className="mt-2 h-5 w-40 animate-pulse rounded bg-muted"></div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress bar skeleton (for regular sets) */}
            {!isMaxEffort && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted"></div>
                  <div className="h-4 w-20 animate-pulse rounded bg-muted"></div>
                </div>
                <div className="h-2 w-full animate-pulse rounded-full bg-muted"></div>
              </div>
            )}

            {/* Recommended sets skeleton (for regular sets) */}
            {!isMaxEffort && (
              <div>
                <div className="mb-2 h-4 w-36 animate-pulse rounded bg-muted"></div>
                <div className="mb-3 h-3 w-full animate-pulse rounded bg-muted"></div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-24 animate-pulse rounded-lg border-2 border-dashed border-muted bg-muted/20"
                    ></div>
                  ))}
                </div>
              </div>
            )}

            {/* Rep counter skeleton */}
            <div className="space-y-3">
              <div className="h-4 w-16 animate-pulse rounded bg-muted"></div>
              <div className="flex items-center justify-center gap-4">
                <div className="h-16 w-16 animate-pulse rounded-md bg-muted"></div>
                <div className="h-20 w-32 animate-pulse rounded bg-muted"></div>
                <div className="h-16 w-16 animate-pulse rounded-md bg-muted"></div>
              </div>
            </div>

            {/* RPE selector skeleton (for regular sets) */}
            {!isMaxEffort && (
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted"></div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-muted"></div>
                  ))}
                </div>
              </div>
            )}

            {/* Save button skeleton */}
            <div className="h-12 w-full animate-pulse rounded-md bg-muted"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!movement) {
    return null;
  }

  const currentTotal = todaySets.reduce((sum, set) => sum + set.reps, 0);
  const exerciseName =
    EXERCISE_VARIATIONS[category].find((ex) => ex.id === movement.exercise_variation)?.name ||
    movement.exercise_variation;

  // Calculate next planned reps for the modal
  const recommendedSets = calculateRecommendedSets(currentTarget, lastBestSet);
  const nextSetIndex = todaySets.length;
  const nextPlannedReps = isMaxEffort
    ? movement.max_effort_reps
    : recommendedSets[nextSetIndex] || recommendedSets[0] || 0;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card className={isRefreshing ? "opacity-90 transition-opacity" : ""}>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-2xl">
            {isMaxEffort && <Trophy className="h-6 w-6 text-yellow-500" />}

            {!isMaxEffort ? (
              <>
                <span>Log Set / </span>
                <span className="font-semibold">{exerciseName}</span>
              </>
            ) : (
              <span>Max Effort Test</span>
            )}
          </CardTitle>
          {isMaxEffort && <CardDescription>{exerciseName}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Progress Bar */}
          {!isMaxEffort && (
            <EnhancedProgressBar
              totalTarget={currentTarget}
              completedSets={todaySets}
              plannedSets={recommendedSets}
              showAnimation={currentTotal >= currentTarget}
              yesterdayTarget={yesterdayTarget}
              readinessScore={readinessScore}
              yesterdaySummary={yesterdaySummary}
              isLoadingContext={yesterdayTarget === undefined}
            />
          )}

          {/* Completed Sets List */}
          <CompletedSetsList
            sets={todaySets}
            onEditSet={handleEditSet}
            onDeleteSet={handleDeleteSet}
            isRefreshing={isRefreshing}
          />

          {/* Log Set Button */}
          <Button onClick={handleLogNewSet} disabled={isRefreshing} className="w-full" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            {isMaxEffort ? "Record Max Effort" : "Log Set"}
          </Button>
        </CardContent>
      </Card>

      {/* Set Logging Modal */}
      <SetLoggingModal
        isOpen={showSetModal}
        onClose={() => setShowSetModal(false)}
        mode={modalMode}
        existingSet={editingSet || undefined}
        nextPlannedReps={nextPlannedReps}
        isMaxEffort={isMaxEffort}
        onSave={handleSaveSet}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Set?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this set and renumber any subsequent sets. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSet}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
