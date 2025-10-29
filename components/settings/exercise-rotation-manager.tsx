"use client";

import { useState, useEffect } from "react";
import { MovementCategory, Movement } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  getActiveExercises,
  addExerciseToRotation,
  removeExerciseFromRotation,
} from "@/lib/utils/exercise-rotation";
import { EXERCISE_VARIATIONS, FORM_CUES } from "@/lib/constants/exercises";
import Image from "next/image";

interface ExerciseRotationManagerProps {
  userId: string;
}

export function ExerciseRotationManager({ userId }: ExerciseRotationManagerProps) {
  const [movements, setMovements] = useState<{
    push: Movement[];
    pull: Movement[];
    legs: Movement[];
  }>({
    push: [],
    pull: [],
    legs: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const [pushData, pullData, legsData] = await Promise.all([
        getActiveExercises(userId, "push"),
        getActiveExercises(userId, "pull"),
        getActiveExercises(userId, "legs"),
      ]);

      setMovements({
        push: pushData,
        pull: pullData,
        legs: legsData,
      });
    } catch (error) {
      console.error("Error loading movements:", error);
      toast.error("Failed to load exercises");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExercise = async (category: MovementCategory, exerciseId: string) => {
    const categoryMovements = movements[category];
    const isCurrentlyActive = categoryMovements.some((m) => m.exercise_variation === exerciseId);
    const exerciseName =
      EXERCISE_VARIATIONS[category].find((ex) => ex.id === exerciseId)?.name || exerciseId;

    if (isCurrentlyActive) {
      // Removing exercise
      if (categoryMovements.length <= 1) {
        toast.error("Cannot remove the last exercise from a category");
        return;
      }

      const success = await removeExerciseFromRotation(userId, category, exerciseId);
      if (success) {
        toast.success(`Removed ${exerciseName} from rotation`);
        loadMovements();
      } else {
        toast.error("Failed to remove exercise");
      }
    } else {
      // Adding exercise
      const success = await addExerciseToRotation(userId, category, exerciseId);
      if (success) {
        toast.success(`Added ${exerciseName} to rotation`);
        loadMovements();
      } else {
        toast.error("Failed to add exercise");
      }
    }
  };

  const isExerciseActive = (category: MovementCategory, exerciseId: string) => {
    return movements[category].some((m) => m.exercise_variation === exerciseId);
  };

  const categoryDisplayName = (cat: MovementCategory) => cat.charAt(0).toUpperCase() + cat.slice(1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(["push", "pull", "legs"] as MovementCategory[]).map((category) => {
        const allExercises = EXERCISE_VARIATIONS[category];

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{categoryDisplayName(category)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allExercises.map((exercise) => {
                  const formCues = FORM_CUES[exercise.id];
                  const isActive = isExerciseActive(category, exercise.id);
                  const isLastActive = isActive && movements[category].length === 1;

                  return (
                    <button
                      key={exercise.id}
                      onClick={() => handleToggleExercise(category, exercise.id)}
                      disabled={isLastActive}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                        isActive
                          ? "border-2 border-primary bg-primary/5 hover:bg-primary/10"
                          : "border opacity-50 hover:opacity-100 hover:border-primary/30"
                      } ${isLastActive ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    >
                      {/* Thumbnail */}
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

                      {/* Exercise info */}
                      <div className="flex-1">
                        <span className={`font-medium ${isActive ? "" : "text-muted-foreground"}`}>
                          {exercise.name}
                        </span>
                        {!exercise.isStandard && (
                          <p className="text-xs text-muted-foreground">Progression exercise</p>
                        )}
                      </div>

                      {/* Status indicator */}
                      {isActive && (
                        <div className="flex items-center gap-2">
                          {isLastActive && (
                            <span className="text-xs text-muted-foreground">(Required)</span>
                          )}
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                            <Plus className="h-3 w-3 rotate-45 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                      {!isActive && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/30">
                          <Plus className="h-3 w-3 text-muted-foreground/30" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
