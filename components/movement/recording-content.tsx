"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MovementCategory, Set as WorkoutSet } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Minus, Plus, Save, Trophy, Edit } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { predictReps, getPreviousDayFirstSet } from "@/lib/utils/predictions";
import { calculateInitialDailyTarget, shouldAutoProgress } from "@/lib/utils/calculations";
import { RPESelector } from "@/components/recording/rpe-selector";
import { RPE10ConfirmationModal } from "@/components/recording/rpe-10-confirmation-modal";
import { EXERCISE_VARIATIONS, getExerciseById } from "@/lib/constants/exercises";

interface RecordingContentProps {
  userId: string;
  category: MovementCategory;
  isMaxEffort: boolean;
  initialExercise?: string;
}

export function RecordingContent({ userId, category, isMaxEffort, initialExercise }: RecordingContentProps) {
  const router = useRouter();
  const [movement, setMovement] = useState<{
    id: string;
    exercise_variation: string;
    max_effort_reps: number;
    daily_target: number;
  } | null>(null);
  const [todaySets, setTodaySets] = useState<WorkoutSet[]>([]);
  const [reps, setReps] = useState(0);
  const [rpe, setRPE] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRPE10Modal, setShowRPE10Modal] = useState(false);

  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

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
            daily_target: 0,
          });
        } else {
          toast.error("Movement not configured. Please set it up first.");
          router.push(`/movement/${category}/select`);
          return;
        }
      } else {
        setMovement(movementData);
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

      // Fetch all sets for prediction
      const { data: allSets } = await supabase
        .from("sets")
        .select("*")
        .eq("user_id", userId)
        .eq("category", category)
        .order("logged_at", { ascending: false })
        .limit(50);

      // Predict reps for next set
      if (movementData) {
        const previousDayFirst = getPreviousDayFirstSet(allSets || [], new Date());
        const predicted = predictReps(setsData || [], movementData.max_effort_reps, previousDayFirst);
        setReps(isMaxEffort ? movementData.max_effort_reps : predicted);
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

  const saveSet = async (isMaxEffortSet: boolean) => {
    if (!movement) return;
    
    setSaving(true);
    try {
      const supabase = createClient();
      const setNumber = todaySets.length + 1;
      let movementId = movement.id;

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
            daily_target: newDailyTarget,
            is_unlocked: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        if (newMovement) {
          movementId = newMovement.id;
          setMovement(newMovement);
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
          daily_target: newDailyTarget,
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

      // Check if daily target is reached (use the latest movement data)
      const currentMovement = movement.id ? movement : { ...movement, daily_target: calculateInitialDailyTarget(reps) };
      const newTotal = todaySets.reduce((sum, s) => sum + s.reps, 0) + reps;
      
      // For max effort sets, always redirect to dashboard
      if (isMaxEffortSet || isMaxEffort) {
        toast.success("🎉 Max effort recorded! Check the dashboard.");
        setTimeout(() => router.push("/dashboard"), 1500);
      } else if (newTotal >= (currentMovement.daily_target || 0)) {
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!movement) {
    return null;
  }

  const currentTotal = todaySets.reduce((sum, set) => sum + set.reps, 0);
  const percentage = Math.min((currentTotal / movement.daily_target) * 100, 100);
  const exerciseName = EXERCISE_VARIATIONS[category].find((ex) => ex.id === movement.exercise_variation)?.name || movement.exercise_variation;

  return (
    <div className="max-w-2xl mx-auto">
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
          <CardTitle className="text-2xl flex items-center gap-2">
            {isMaxEffort && <Trophy className="h-6 w-6 text-yellow-500" />}
            {isMaxEffort ? "Max Effort Test" : "Log Set"} - {categoryName}
          </CardTitle>
          <div className="flex items-center justify-between">
            <CardDescription>{exerciseName}</CardDescription>
            {!isMaxEffort && (
              <Link href={`/movement/${category}/select`}>
                <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs">
                  <Edit className="h-3 w-3 mr-1" />
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
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Today&apos;s Progress</span>
                <span className="text-sm text-muted-foreground">
                  {currentTotal} / {movement.daily_target} reps
                </span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          )}

          {/* Today's Sets */}
          {todaySets.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Previous Sets Today</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {todaySets.map((set, idx) => (
                  <div
                    key={set.id}
                    className="rounded-lg border bg-muted/50 p-3 text-center"
                  >
                    <div className="text-xs text-muted-foreground mb-1">Set {idx + 1}</div>
                    <div className="text-lg font-bold">{set.reps} reps</div>
                    <div className="text-xs text-muted-foreground">RPE {set.rpe}</div>
                  </div>
                ))}
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
              <div className="text-6xl font-bold w-32 text-center">{reps}</div>
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
          {!isMaxEffort && (
            <RPESelector value={rpe} onChange={setRPE} />
          )}

          {/* Save Button */}
          <Button
            onClick={handleLogSet}
            disabled={saving || reps <= 0}
            className="w-full"
            size="lg"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : isMaxEffort ? "Record Max Effort" : "Log Set"}
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
    </div>
  );
}

