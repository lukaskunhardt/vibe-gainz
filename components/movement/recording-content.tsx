"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MovementCategory, Set as WorkoutSet } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Plus, Save, Trophy, Pencil } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { calculateInitialDailyTarget, shouldAutoProgress } from "@/lib/utils/calculations";
import { RPESelector } from "@/components/recording/rpe-selector";
import { RPE10ConfirmationModal } from "@/components/recording/rpe-10-confirmation-modal";
import { EnhancedProgressBar } from "@/components/recording/enhanced-progress-bar";
import { EXERCISE_VARIATIONS, getExerciseById, FORM_CUES } from "@/lib/constants/exercises";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";

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
  const [reps, setReps] = useState(0);
  const [rpe, setRPE] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRPE10Modal, setShowRPE10Modal] = useState(false);
  const [lastBestSet, setLastBestSet] = useState<number>(0);
  const [showExerciseSheet, setShowExerciseSheet] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  const exercises = EXERCISE_VARIATIONS[category];

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
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, category]);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // OPTIMIZATION: Parallelize all queries
      const [
        { data: movementData },
        { data: targetData },
        { data: setsData },
        { data: lastSessionSets },
      ] = await Promise.all([
        // Fetch movement
        supabase
          .from("movements")
          .select("*")
          .eq("user_id", userId)
          .eq("category", category)
          .single(),
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
      ]);

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
        setMovement(movementData);
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

      // Prefill reps based on the next planned set
      if (movementData && target > 0 && calculatedLastBestSet > 0) {
        const recommendedSets = calculateRecommendedSets(target, calculatedLastBestSet);
        if (isMaxEffort) {
          setReps(movementData.max_effort_reps);
        } else {
          // Set reps to the next planned set based on how many sets are already completed
          const nextSetIndex = setsData?.length || 0;
          const nextSetReps = recommendedSets[nextSetIndex] || recommendedSets[0] || 0;
          setReps(nextSetReps);
        }
      } else {
        // Initial setup - start with 0
        setReps(0);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogSet = async () => {
    if (reps <= 0) {
      toast.error("Please enter a valid number of reps");
      return;
    }

    // Show RPE 10 confirmation if not max effort mode
    if (!isMaxEffort && rpe === 10) {
      setShowRPE10Modal(true);
      return;
    }

    await saveSet(false);
  };

  const handleMaxEffortConfirm = async () => {
    await saveSet(true);
    setShowRPE10Modal(false);
  };

  const handleRegularSetConfirm = async () => {
    await saveSet(false);
    setShowRPE10Modal(false);
  };

  const handleExerciseChange = async (exerciseId: string) => {
    if (!movement) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("movements")
        .update({
          exercise_variation: exerciseId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", movement.id);

      if (error) throw error;

      const exerciseName = exercises.find((ex) => ex.id === exerciseId)?.name || exerciseId;
      toast.success(`Exercise changed to ${exerciseName}`);

      setShowExerciseSheet(false);
      await loadData();
    } catch (error) {
      console.error("Error updating exercise:", error);
      toast.error("Failed to update exercise. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleExpanded = (exerciseId: string) => {
    setExpandedExercise(expandedExercise === exerciseId ? null : exerciseId);
  };

  const saveSet = async (isMaxEffortSet: boolean) => {
    if (!movement) return;

    setSaving(true);
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
        await loadData();
        toast.success("🎉 Daily target reached! Great work!");
        // Wait longer to allow animation to play (animation is 800ms + extra time to see it)
        setTimeout(() => router.push("/dashboard"), 2500);
        return; // Exit early
      }

      // Reload data (which will set the next planned set reps)
      await loadData();

      // Reset RPE for the next set
      setRPE(0);
    } catch (error) {
      console.error("Error saving set:", error);
      toast.error("Failed to save set. Please try again.");
    } finally {
      setSaving(false);
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

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-2xl">
            {isMaxEffort && <Trophy className="h-6 w-6 text-yellow-500" />}

            {!isMaxEffort ? (
              <>
                <span>Log Set /</span>
                <button
                  type="button"
                  onClick={() => setShowExerciseSheet(true)}
                  onMouseEnter={() => {
                    // Prefetch the selection page
                    router.prefetch(`/movement/${category}/select`);
                  }}
                  className="group inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-semibold text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {exerciseName}
                  <Pencil className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
                </button>
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
              plannedSets={calculateRecommendedSets(currentTarget, lastBestSet)}
              showAnimation={currentTotal >= currentTarget}
            />
          )}

          {/* Rep Counter */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              {isMaxEffort ? "Max Effort Reps" : "Reps"}
            </label>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-16 w-16"
                onClick={() => setReps(Math.max(0, reps - 1))}
                disabled={reps <= 0}
              >
                <Minus className="h-6 w-6" />
              </Button>
              <div className="w-32 text-center text-6xl font-bold">{reps}</div>
              <Button
                variant="outline"
                size="icon"
                className="h-16 w-16"
                onClick={() => setReps(reps + 1)}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* RPE Selector */}
          {!isMaxEffort && <RPESelector value={rpe} onChange={setRPE} />}

          {/* Save Button */}
          <Button
            onClick={handleLogSet}
            disabled={saving || reps <= 0 || (!isMaxEffort && rpe === 0)}
            className="w-full"
            size="lg"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : isMaxEffort ? "Record Max Effort" : "Save Set"}
          </Button>
        </CardContent>
      </Card>

      {/* RPE 10 Confirmation Modal */}
      {showRPE10Modal && (
        <RPE10ConfirmationModal
          onMaxEffort={handleMaxEffortConfirm}
          onRegularSet={handleRegularSetConfirm}
          onChangeRPE={() => setShowRPE10Modal(false)}
        />
      )}

      {/* Exercise Selection Sheet */}
      <Sheet open={showExerciseSheet} onOpenChange={setShowExerciseSheet}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Change {categoryName} Exercise</SheetTitle>
            <SheetDescription>
              Tap an exercise to select it, or expand to view form details.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-2 px-4 pb-6">
            {exercises.map((exercise) => {
              const isExpanded = expandedExercise === exercise.id;
              const isCurrent = movement?.exercise_variation === exercise.id;
              const formCues = FORM_CUES[exercise.id];

              return (
                <div
                  key={exercise.id}
                  className={`rounded-lg border-2 transition-colors ${
                    isCurrent
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {/* Collapsed Header - Clickable to select */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCurrent) {
                        handleExerciseChange(exercise.id);
                      }
                    }}
                    disabled={saving}
                    className="flex w-full items-center justify-between p-4 text-left transition-opacity disabled:opacity-50"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      {/* Small GIF thumbnail if available */}
                      {formCues?.gifUrl && (
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                          <Image
                            src={formCues.gifUrl}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{exercise.name}</span>
                          {isCurrent && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Current
                            </Badge>
                          )}
                        </div>
                        {!exercise.isStandard && (
                          <span className="text-xs text-muted-foreground">
                            Progression exercise
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand/Collapse button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(exercise.id);
                      }}
                      className="ml-2 rounded p-1 hover:bg-muted"
                      aria-label={isExpanded ? "Collapse details" : "Expand details"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="space-y-4 border-t px-4 pb-4 pt-4">
                      {/* Form Cues */}
                      {formCues && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold">Form Cues</h4>
                          <ul className="space-y-2">
                            {formCues.cues.map((cue, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                                <span className="text-sm text-muted-foreground">{cue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Progression Info */}
                      {!exercise.isStandard && (
                        <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                          <h4 className="mb-1 text-sm font-semibold">Progression Path</h4>
                          <p className="mb-2 text-xs text-muted-foreground">
                            When you reach 20+ reps on your max effort test, you&apos;ll
                            automatically progress to the next difficulty level.
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {exercises.map((ex) => (
                              <div
                                key={ex.id}
                                className={`rounded px-2 py-0.5 text-xs ${
                                  ex.id === exercise.id
                                    ? "bg-primary font-semibold text-primary-foreground"
                                    : ex.difficulty < exercise.difficulty
                                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                      : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {ex.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Training Tips */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Training Tips</h4>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <p>
                            <strong>Focus on the Eccentric:</strong> The lowering phase is crucial
                            for building strength. Aim for a 3-second controlled descent.
                          </p>
                          <p>
                            <strong>Optimal RPE Range:</strong> For most sets, aim for RPE 6-8. This
                            provides enough stimulus while minimizing fatigue.
                          </p>
                          <p>
                            <strong>Avoid Training to Failure:</strong> Reserve RPE 10 for max
                            effort tests only. Regular training to failure limits weekly volume.
                          </p>
                        </div>
                      </div>

                      {/* GIF/Video */}
                      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                        {formCues?.gifUrl ? (
                          <Image
                            src={formCues.gifUrl}
                            alt={`${exercise.name} demonstration`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            Form video placeholder
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
