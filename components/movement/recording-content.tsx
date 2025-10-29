"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ExerciseStatus, MovementCategory, Set as WorkoutSet, Movement } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trophy, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { SetCountProgressBar } from "@/components/recording/set-count-progress-bar";
import { computeSetMetrics, getDailyPrescription } from "@/lib/utils/prescription";
import { SetLoggingModal } from "@/components/recording/set-logging-modal";
import { CompletedSetsList } from "@/components/recording/completed-sets-list";
import { updateSet, deleteSet } from "@/lib/hooks/use-sets";
import { EXERCISE_VARIATIONS, FORM_CUES } from "@/lib/constants/exercises";
import { PRPromptModal } from "@/components/movement/pr-prompt-modal";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getActiveExercises } from "@/lib/utils/exercise-rotation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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
  } | null>(null);
  const [todaySets, setTodaySets] = useState<WorkoutSet[]>([]);
  const [loading, setLoading] = useState(true); // Initial page load only
  const [isRefreshing, setIsRefreshing] = useState(false); // Post-action data refresh
  const [readiness, setReadiness] = useState<number | null>(null);
  const [exerciseStatus, setExerciseStatus] = useState<ExerciseStatus | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);

  useEffect(() => {
    if (
      !isMaxEffort &&
      exerciseStatus?.prompt_pending &&
      (readiness ?? 0) >= 3 &&
      !promptDismissed
    ) {
      setShowPRModal(true);
    } else {
      setShowPRModal(false);
    }
  }, [exerciseStatus, readiness, isMaxEffort, promptDismissed]);

  // Modal state
  const [showSetModal, setShowSetModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingSet, setEditingSet] = useState<WorkoutSet | null>(null);

  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [setToDelete, setSetToDelete] = useState<string | null>(null);

  // Change exercise sheet state
  const [showChangeExerciseSheet, setShowChangeExerciseSheet] = useState(false);
  const [activeExercises, setActiveExercises] = useState<Movement[]>([]);

  // Old daily-target logic removed; prescription comes from readiness and max-effort

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

      // OPTIMIZATION: Parallelize initial queries
      const [{ data: dailyStatsData }, { data: setsData }] = await Promise.all([
        // Fetch today's daily stats (for exercise selection and readiness)
        supabase
          .from("daily_user_stats")
          .select(`${category}_exercise_id,readiness_score`)
          .eq("user_id", userId)
          .eq("date", todayStr)
          .maybeSingle(),
        // Fetch today's sets
        supabase
          .from("sets")
          .select("*")
          .eq("user_id", userId)
          .eq("category", category)
          .gte("logged_at", todayStart.toISOString())
          .lte("logged_at", todayEnd.toISOString())
          .order("set_number", { ascending: true }),
      ]);

      // Get today's exercise selection from daily_user_stats
      const exerciseField = `${category}_exercise_id`;
      const todayExerciseRaw = dailyStatsData
        ? (dailyStatsData as Record<string, string | number | null>)[exerciseField as string]
        : null;
      const todayExercise = typeof todayExerciseRaw === "string" ? todayExerciseRaw : null;
      const readinessScoreRaw = dailyStatsData
        ? (dailyStatsData as Record<string, string | number | null>)["readiness_score"]
        : null;
      setReadiness(typeof readinessScoreRaw === "number" ? readinessScoreRaw : null);

      // Determine which exercise we're working with
      const effectiveExercise = todayExercise || initialExercise || null;

      // If no daily exercise selected, redirect to selection page
      if (!todayExercise && !isMaxEffort) {
        toast.error("Please select an exercise for today first.");
        router.push(`/movement/${category}/select-daily`);
        return;
      }

      // Fetch movement for the specific exercise
      let movementData = null;
      if (effectiveExercise) {
        const { data } = await supabase
          .from("movements")
          .select("*")
          .eq("user_id", userId)
          .eq("category", category)
          .eq("exercise_variation", effectiveExercise)
          .maybeSingle();
        movementData = data;
      }

      // Check if at least one movement exists for this category
      if (!isMaxEffort) {
        const { data: anyMovement } = await supabase
          .from("movements")
          .select("id")
          .eq("user_id", userId)
          .eq("category", category)
          .limit(1)
          .maybeSingle();

        if (!anyMovement) {
          toast.error("Movement not configured. Please set it up first.");
          router.push(`/movement/${category}/select`);
          return;
        }
      }

      let status: ExerciseStatus | null = null;
      if (effectiveExercise) {
        const { data: statusData } = await supabase
          .from("exercise_status")
          .select("*")
          .eq("user_id", userId)
          .eq("exercise_id", effectiveExercise)
          .maybeSingle();
        status = (statusData as ExerciseStatus | null) ?? null;
      }

      setExerciseStatus(status);
      setPromptDismissed(false);

      if (movementData) {
        setMovement({
          id: movementData.id,
          exercise_variation: effectiveExercise || movementData.exercise_variation,
        });
      } else if (isMaxEffort && effectiveExercise) {
        setMovement({
          id: "",
          exercise_variation: effectiveExercise,
        });
      }

      setTodaySets(setsData || []);
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

  const loadActiveExercises = async () => {
    try {
      const exercises = await getActiveExercises(userId, category);
      setActiveExercises(exercises);
    } catch (error) {
      console.error("Error loading active exercises:", error);
    }
  };

  const handleOpenChangeExercise = async () => {
    await loadActiveExercises();
    setShowChangeExerciseSheet(true);
  };

  const handleChangeExercise = async (newExerciseId: string) => {
    const hasSetsLogged = todaySets.length > 0;

    if (hasSetsLogged) {
      // Show warning but allow change
      const confirmed = window.confirm(
        "You have already logged sets today. Changing exercises will mix different exercises in one day. Continue?"
      );
      if (!confirmed) {
        return;
      }
    }

    setIsRefreshing(true);
    try {
      const supabase = createClient();
      const today = format(new Date(), "yyyy-MM-dd");
      const exerciseField = `${category}_exercise_id`;

      // Update daily_user_stats with new exercise
      const { error } = await supabase.from("daily_user_stats").upsert(
        {
          user_id: userId,
          date: today,
          [exerciseField]: newExerciseId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,date",
        }
      );

      if (error) throw error;

      const exerciseName =
        EXERCISE_VARIATIONS[category].find((ex) => ex.id === newExerciseId)?.name || newExerciseId;
      toast.success(`Exercise changed to ${exerciseName}`);

      // Reload data to update UI
      await loadData(false);
      setShowChangeExerciseSheet(false);
    } catch (error) {
      console.error("Error changing exercise:", error);
      toast.error("Failed to change exercise");
    } finally {
      setIsRefreshing(false);
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
        const { data: newMovement, error: createError } = await supabase
          .from("movements")
          .insert({
            user_id: userId,
            category,
            exercise_variation: movement.exercise_variation,
            rotation_order: 1,
            last_used_date: null,
          })
          .select()
          .single();

        if (createError) throw createError;
        if (newMovement) {
          movementId = newMovement.id;
          setMovement({ id: newMovement.id, exercise_variation: newMovement.exercise_variation });
        }
      }

      // Insert set
      const { rir, impliedMaxReps } = computeSetMetrics(reps, rpe, isMaxEffortSet || isMaxEffort);

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
        rir,
        implied_max_reps: impliedMaxReps,
      });

      if (setError) throw setError;

      if (isMaxEffortSet || isMaxEffort) {
        toast.success("🎉 Max effort recorded! Check the dashboard.");
        setTimeout(() => router.push("/dashboard"), 1500);
        return; // Exit early
      }

      toast.success(`Set ${setNumber} logged: ${reps} reps @ RPE ${rpe}`);

      // Redirect when prescribed set count is met
      const nonMaxCompleted = todaySets.filter((s) => !s.is_max_effort).length;
      const completedIncludingThis = nonMaxCompleted + 1;
      const basePR = exerciseStatus?.current_pr_reps ?? 0;
      const { sets: prescribedSets } = getDailyPrescription(readiness, basePR);
      if (prescribedSets > 0 && completedIncludingThis >= prescribedSets) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await loadData(false);
        toast.success("🎉 All prescribed sets completed! Great work!");
        setTimeout(() => router.push("/dashboard"), 1500);
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
              <div className="space-y-3">
                <div>
                  <div className="h-4 w-24 animate-pulse rounded bg-muted"></div>
                  <div className="mt-1 h-3 w-full animate-pulse rounded bg-muted"></div>
                </div>
                <div className="h-14 w-full animate-pulse rounded-2xl border-4 border-muted bg-muted/20"></div>
              </div>
            )}

            {/* Completed sets list skeleton */}
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="h-5 w-32 animate-pulse rounded bg-muted"></div>
                  <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                </div>
              ))}
            </div>

            {/* Log Set button skeleton */}
            <div className="h-12 w-full animate-pulse rounded-md bg-muted"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!movement) {
    return null;
  }

  const exerciseName =
    EXERCISE_VARIATIONS[category].find((ex) => ex.id === movement.exercise_variation)?.name ||
    movement.exercise_variation;

  const currentPR = exerciseStatus?.current_pr_reps ?? 0;

  // Calculate next planned reps and target RPE for modal from readiness+max effort
  const {
    sets: prescribedSets,
    targetRPE,
    repsPerSet,
  } = getDailyPrescription(readiness, currentPR);
  const nonMaxSets = todaySets.filter((s) => !s.is_max_effort);
  const nonMaxCompleted = nonMaxSets.length;
  const plannedSets = Array.from({ length: prescribedSets }, (_, index) => ({
    index: index + 1,
    reps: repsPerSet,
    targetRPE,
  }));
  const nextPlannedReps = isMaxEffort ? currentPR : repsPerSet;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-2">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        {!isMaxEffort && (
          <Button variant="outline" size="sm" onClick={handleOpenChangeExercise}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Change Exercise
          </Button>
        )}
      </div>

      <Card className={isRefreshing ? "opacity-90 transition-opacity" : ""}>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-2xl">
            {isMaxEffort && <Trophy className="h-6 w-6 text-yellow-500" />}

            {!isMaxEffort ? (
              <>
                <span>Log Set: </span>
                <span className="font-semibold">{exerciseName}</span>
              </>
            ) : (
              <span>Max Effort Test</span>
            )}
          </CardTitle>
          {isMaxEffort && <CardDescription>{exerciseName}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Set-Count Progress Bar */}
          {!isMaxEffort && (
            <SetCountProgressBar
              prescribedSets={prescribedSets}
              completedNonMaxSets={nonMaxCompleted}
            />
          )}

          {/* Completed Sets List */}
          <CompletedSetsList
            sets={todaySets}
            plannedSets={!isMaxEffort ? plannedSets : []}
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
        defaultRPE={!isMaxEffort ? targetRPE : undefined}
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

      <PRPromptModal
        isOpen={showPRModal && !isMaxEffort && !!exerciseStatus?.latest_implied_max_reps}
        currentPR={exerciseStatus?.current_pr_reps ?? 0}
        impliedMax={exerciseStatus?.latest_implied_max_reps ?? 0}
        onDismiss={() => {
          setPromptDismissed(true);
          setShowPRModal(false);
        }}
        onTakeTest={() => {
          setPromptDismissed(false);
          setShowPRModal(false);
          router.push(`/movement/${category}/record?mode=max-effort`);
        }}
      />

      {/* Change Exercise Sheet */}
      <Sheet open={showChangeExerciseSheet} onOpenChange={setShowChangeExerciseSheet}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Change Exercise</SheetTitle>
            <SheetDescription>
              Select a different exercise from your active rotation for today
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {activeExercises.map((exercise) => {
              const exerciseInfo = EXERCISE_VARIATIONS[category].find(
                (ex) => ex.id === exercise.exercise_variation
              );
              const formCues = FORM_CUES[exercise.exercise_variation];
              const isCurrent = movement?.exercise_variation === exercise.exercise_variation;

              return (
                <button
                  key={exercise.id}
                  onClick={() => handleChangeExercise(exercise.exercise_variation)}
                  disabled={isCurrent || isRefreshing}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    isCurrent
                      ? "cursor-not-allowed border-primary bg-primary/5 opacity-60"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {/* Thumbnail */}
                  {formCues?.gifUrl && (
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      <Image
                        src={formCues.gifUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}

                  {/* Exercise info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{exerciseInfo?.name || "Unknown"}</span>
                      {isCurrent && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {activeExercises.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">
                No active exercises found. Please configure exercises in Settings.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
