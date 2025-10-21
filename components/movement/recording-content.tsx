"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MovementCategory, Set as WorkoutSet } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Minus, Plus, Save, Trophy, Edit, Check, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { calculateInitialDailyTarget, shouldAutoProgress } from "@/lib/utils/calculations";
import { RPESelector } from "@/components/recording/rpe-selector";
import { RPE10ConfirmationModal } from "@/components/recording/rpe-10-confirmation-modal";
import { EXERCISE_VARIATIONS, getExerciseById } from "@/lib/constants/exercises";
import { colorForRPE } from "@/lib/constants/rpe";

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
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

  // Calculate recommended sets based on daily target and max effort
  const calculateRecommendedSets = (dailyTarget: number, maxEffortReps: number) => {
    const targetRepsPerSet = Math.floor(maxEffortReps * 0.8);
    const numberOfSets = Math.ceil(dailyTarget / targetRepsPerSet);
    return { targetRepsPerSet, numberOfSets };
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, category]);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Fetch movement
      const { data: movementData } = await supabase
        .from("movements")
        .select("*")
        .eq("user_id", userId)
        .eq("category", category)
        .single();

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

        // Fetch current target from history
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const { data: targetData } = await supabase
          .from("movement_target_history")
          .select("target")
          .eq("movement_id", movementData.id)
          .lte("date", todayStr)
          .order("date", { ascending: false })
          .limit(1);
        target = targetData?.[0]?.target ?? 0;
        setCurrentTarget(target);
      }

      // Fetch today's sets
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data: setsData } = await supabase
        .from("sets")
        .select("*")
        .eq("user_id", userId)
        .eq("category", category)
        .gte("logged_at", todayStart.toISOString())
        .lte("logged_at", todayEnd.toISOString())
        .order("set_number", { ascending: true });

      setTodaySets(setsData || []);

      // Prefill reps strictly to planned per-set target (no discounts)
      if (movementData && target > 0) {
        const { targetRepsPerSet } = calculateRecommendedSets(target, movementData.max_effort_reps);
        setReps(isMaxEffort ? movementData.max_effort_reps : targetRepsPerSet);
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

  const handleSetSelection = (set: WorkoutSet | null, suggestedReps?: number) => {
    if (set) {
      // Editing existing set
      setSelectedSetId(set.id);
      setIsEditMode(true);
      setReps(set.reps);
      setRPE(0); // Always reset RPE to unselected
    } else {
      // Logging new set with suggested reps
      setSelectedSetId(null);
      setIsEditMode(false);
      setReps(suggestedReps || 0);
      setRPE(0);
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

  const handleDeleteSet = async () => {
    if (!selectedSetId) return;

    if (!confirm("Are you sure you want to delete this set?")) {
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("sets").delete().eq("id", selectedSetId);

      if (error) throw error;

      toast.success("Set deleted");

      // Reset selection state
      setSelectedSetId(null);
      setIsEditMode(false);

      // Reload data
      await loadData();
    } catch (error) {
      console.error("Error deleting set:", error);
      toast.error("Failed to delete set. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveSet = async (isMaxEffortSet: boolean) => {
    if (!movement) return;

    setSaving(true);
    try {
      const supabase = createClient();
      let movementId = movement.id;

      // Handle editing existing set
      if (isEditMode && selectedSetId) {
        const { error: updateError } = await supabase
          .from("sets")
          .update({
            reps,
            rpe,
          })
          .eq("id", selectedSetId);

        if (updateError) throw updateError;

        toast.success("Set updated!");

        // Reset selection state
        setSelectedSetId(null);
        setIsEditMode(false);

        // Reload data and return early
        await loadData();
        return;
      }

      // Below is for inserting new sets
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

      // Reload data
      await loadData();

      // Reset selection state
      setSelectedSetId(null);
      setIsEditMode(false);

      // Check if daily target is reached
      const newTotal = todaySets.reduce((sum, s) => sum + s.reps, 0) + reps;
      const targetToCheck =
        (isMaxEffortSet || isMaxEffort) && !movement.id
          ? calculateInitialDailyTarget(reps)
          : currentTarget;

      // For max effort sets, always redirect to dashboard
      if (isMaxEffortSet || isMaxEffort) {
        toast.success("🎉 Max effort recorded! Check the dashboard.");
        setTimeout(() => router.push("/dashboard"), 1500);
      } else if (newTotal >= targetToCheck) {
        toast.success("🎉 Daily target reached! Great work!");
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    } catch (error) {
      console.error("Error saving set:", error);
      toast.error("Failed to save set. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!movement) {
    return null;
  }

  const currentTotal = todaySets.reduce((sum, set) => sum + set.reps, 0);
  const percentage = currentTarget > 0 ? Math.min((currentTotal / currentTarget) * 100, 100) : 0;
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
          <CardTitle className="flex items-center gap-2 text-2xl">
            {isMaxEffort && <Trophy className="h-6 w-6 text-yellow-500" />}
            {isMaxEffort ? "Max Effort Test" : "Log Set"} - {categoryName}
          </CardTitle>
          <div className="flex items-center justify-between">
            <CardDescription>{exerciseName}</CardDescription>
            {!isMaxEffort && (
              <Link href={`/movement/${category}/select`}>
                <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs">
                  <Edit className="mr-1 h-3 w-3" />
                  Change Exercise
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          {!isMaxEffort && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Today&apos;s Progress</span>
                <span className="text-sm text-muted-foreground">
                  {currentTotal} / {currentTarget} reps
                </span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          )}

          {/* Recommended & Logged Sets */}
          {!isMaxEffort && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Recommended Sets</h3>
              {(() => {
                const { targetRepsPerSet } = calculateRecommendedSets(
                  currentTarget,
                  movement.max_effort_reps
                );
                return (
                  <p className="mb-3 text-xs text-muted-foreground">
                    Based on a max effort of {movement.max_effort_reps} reps, aim for about{" "}
                    {targetRepsPerSet} reps per set (RPE 7-8) to reach your daily target of{" "}
                    {currentTarget} reps.
                  </p>
                );
              })()}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(() => {
                  const { targetRepsPerSet, numberOfSets } = calculateRecommendedSets(
                    currentTarget,
                    movement.max_effort_reps
                  );
                  const totalCards = Math.max(numberOfSets, todaySets.length + 1);

                  return Array.from({ length: totalCards }).map((_, idx) => {
                    const loggedSet = todaySets[idx];
                    const isNextSet = idx === todaySets.length;
                    const isBonusSet = idx >= numberOfSets;
                    const isSelected = loggedSet
                      ? selectedSetId === loggedSet.id
                      : selectedSetId === null && isEditMode === false && isNextSet;

                    if (loggedSet) {
                      // Logged set card - green border with checkmark
                      return (
                        <div
                          key={loggedSet.id}
                          onClick={() => handleSetSelection(loggedSet)}
                          className={`group relative rounded-lg ${
                            isSelected ? "border-2 border-primary" : "border-2 border-green-500"
                          } cursor-pointer bg-green-50 p-3 text-center transition-all hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-950/30`}
                        >
                          {/* Checkmark - always in top-right */}
                          <Check className="absolute right-2 top-2 h-4 w-4 text-green-600 dark:text-green-400" />

                          {/* Pencil - appears in top-left on hover */}
                          <Pencil className="absolute left-2 top-2 h-3.5 w-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />

                          <div className="mb-1 text-xs text-muted-foreground group-hover:hidden">
                            {isBonusSet ? "Bonus Set" : `Set ${idx + 1}`}
                          </div>
                          <div className="mb-1 hidden text-xs font-medium text-primary group-hover:block">
                            Edit Set
                          </div>
                          <div className="text-lg font-bold">{loggedSet.reps} reps</div>
                          <div className="mt-1 text-xs">
                            {(() => {
                              const c = colorForRPE(loggedSet.rpe, loggedSet.is_max_effort);
                              const textOnColor =
                                loggedSet.rpe >= 9 || loggedSet.is_max_effort
                                  ? "#FFFFFF"
                                  : undefined;
                              return (
                                <span
                                  className="inline-block rounded px-2 py-0.5 text-xs"
                                  style={{ backgroundColor: c, color: textOnColor }}
                                >
                                  RPE {loggedSet.rpe}
                                  {loggedSet.is_max_effort ? " • Max" : ""}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    } else if (isNextSet) {
                      // Next set card - clickable with "Tap to log"
                      return (
                        <div
                          key={`next-set-${idx}`}
                          onClick={() => handleSetSelection(null, targetRepsPerSet)}
                          className={`rounded-lg border-2 ${
                            isSelected
                              ? "border-primary"
                              : "border-dashed border-muted-foreground/40"
                          } cursor-pointer bg-background p-3 text-center transition-colors hover:bg-muted/30`}
                        >
                          <div className="mb-1 text-xs text-muted-foreground">
                            {isBonusSet ? "Bonus Set" : `Set ${idx + 1}`}
                          </div>
                          <div className="text-lg font-bold text-foreground">
                            {targetRepsPerSet} reps
                          </div>
                          <div className="mt-1 text-xs font-medium text-primary">Tap to log</div>
                        </div>
                      );
                    } else {
                      // Future set card - not clickable yet
                      return (
                        <div
                          key={`future-set-${idx}`}
                          className="rounded-lg border-2 border-dashed border-muted-foreground/20 bg-background p-3 text-center opacity-50"
                        >
                          <div className="mb-1 text-xs text-muted-foreground">
                            {isBonusSet ? "Bonus Set" : `Set ${idx + 1}`}
                          </div>
                          <div className="text-lg font-bold text-muted-foreground">
                            {targetRepsPerSet} reps
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">&nbsp;</div>
                        </div>
                      );
                    }
                  });
                })()}
              </div>
            </div>
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
          <div className="space-y-2">
            <Button
              onClick={handleLogSet}
              disabled={saving || reps <= 0 || (!isMaxEffort && rpe === 0)}
              className="w-full"
              size="lg"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving
                ? "Saving..."
                : isMaxEffort
                  ? "Record Max Effort"
                  : isEditMode
                    ? "Save Changes"
                    : "Save Set"}
            </Button>

            {/* Delete Button - only show when editing existing set */}
            {isEditMode && selectedSetId && (
              <Button
                onClick={handleDeleteSet}
                disabled={saving}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Set
              </Button>
            )}
          </div>
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
    </div>
  );
}
