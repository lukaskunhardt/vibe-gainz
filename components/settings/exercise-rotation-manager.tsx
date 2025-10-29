"use client";

import { useState, useEffect } from "react";
import { MovementCategory, Movement } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getActiveExercises,
  addExerciseToRotation,
  removeExerciseFromRotation,
} from "@/lib/utils/exercise-rotation";
import { EXERCISE_VARIATIONS, FORM_CUES } from "@/lib/constants/exercises";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MovementCategory | null>(null);

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

  const handleAddExercise = async (exerciseId: string) => {
    if (!selectedCategory) return;

    const success = await addExerciseToRotation(userId, selectedCategory, exerciseId);
    if (success) {
      const exerciseName =
        EXERCISE_VARIATIONS[selectedCategory].find((ex) => ex.id === exerciseId)?.name ||
        exerciseId;
      toast.success(`Added ${exerciseName} to rotation`);
      loadMovements();
      setAddDialogOpen(false);
    } else {
      toast.error("Failed to add exercise");
    }
  };

  const handleRemoveExercise = async (category: MovementCategory, exerciseId: string) => {
    const categoryMovements = movements[category];
    if (categoryMovements.length <= 1) {
      toast.error("Cannot remove the last exercise from a category");
      return;
    }

    const success = await removeExerciseFromRotation(userId, category, exerciseId);
    if (success) {
      const exerciseName =
        EXERCISE_VARIATIONS[category].find((ex) => ex.id === exerciseId)?.name || exerciseId;
      toast.success(`Removed ${exerciseName} from rotation`);
      loadMovements();
    } else {
      toast.error("Failed to remove exercise");
    }
  };

  const handleOpenAddDialog = (category: MovementCategory) => {
    setSelectedCategory(category);
    setAddDialogOpen(true);
  };

  const getAvailableExercises = (category: MovementCategory) => {
    const activeExerciseIds = movements[category].map((m) => m.exercise_variation);
    return EXERCISE_VARIATIONS[category].filter((ex) => !activeExerciseIds.includes(ex.id));
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
      {(["push", "pull", "legs"] as MovementCategory[]).map((category) => (
        <Card key={category}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{categoryDisplayName(category)}</CardTitle>
              <Button size="sm" onClick={() => handleOpenAddDialog(category)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Exercise
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {movements[category].length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No exercises configured for this category
              </p>
            ) : (
              <div className="space-y-2">
                {movements[category].map((movement) => {
                  const exercise = EXERCISE_VARIATIONS[category].find(
                    (ex) => ex.id === movement.exercise_variation
                  );
                  const formCues = FORM_CUES[movement.exercise_variation];

                  return (
                    <div
                      key={movement.id}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
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
                        <span className="font-medium">{exercise?.name || "Unknown"}</span>
                      </div>

                      {/* Remove button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExercise(category, movement.exercise_variation)}
                        disabled={movements[category].length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add Exercise Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Add {selectedCategory && categoryDisplayName(selectedCategory)} Exercise
            </DialogTitle>
            <DialogDescription>
              Select an exercise to add to your rotation for this category
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedCategory &&
              getAvailableExercises(selectedCategory).map((exercise) => {
                const formCues = FORM_CUES[exercise.id];

                return (
                  <Card
                    key={exercise.id}
                    className="group cursor-pointer overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg"
                    onClick={() => handleAddExercise(exercise.id)}
                  >
                    {/* GIF/Image Section */}
                    <div className="relative aspect-video w-full overflow-hidden bg-white">
                      {formCues?.gifUrl ? (
                        <Image
                          src={formCues.gifUrl}
                          alt={`${exercise.name} demonstration`}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-muted">
                          <span className="text-sm font-medium text-muted-foreground">
                            {exercise.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Exercise Info */}
                    <CardContent className="p-4">
                      <h3 className="font-semibold leading-tight">{exercise.name}</h3>
                      {!exercise.isStandard && (
                        <p className="text-xs text-muted-foreground">Progression exercise</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {selectedCategory && getAvailableExercises(selectedCategory).length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              All exercises for this category are already in your rotation
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
