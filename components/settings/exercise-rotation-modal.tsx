"use client";

import { useState, useEffect } from "react";
import { MovementCategory } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExerciseRotationManager } from "./exercise-rotation-manager";
import { getActiveExercises } from "@/lib/utils/exercise-rotation";

interface ExerciseRotationModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: MovementCategory;
  onComplete?: () => void;
}

export function ExerciseRotationModal({
  userId,
  open,
  onOpenChange,
  initialCategory,
  onComplete,
}: ExerciseRotationModalProps) {
  const [hasExercises, setHasExercises] = useState(false);

  // Check if user has added at least one exercise for the required category
  useEffect(() => {
    if (open) {
      checkExercises();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const checkExercises = async () => {
    if (!initialCategory) {
      setHasExercises(true);
      return;
    }

    const exercises = await getActiveExercises(userId, initialCategory);
    setHasExercises(exercises.length > 0);
  };

  const handleExercisesChange = () => {
    checkExercises();
  };

  const handleDone = () => {
    if (onComplete) {
      onComplete();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Exercise Rotation</DialogTitle>
          <DialogDescription>
            {initialCategory
              ? `Select at least one exercise for ${initialCategory} to get started. The app will automatically rotate through your selected exercises each day.`
              : "Manage which exercises to rotate through for each movement category. The app will automatically cycle through your selected exercises each day."}
          </DialogDescription>
        </DialogHeader>

        <ExerciseRotationManager
          userId={userId}
          initialCategory={initialCategory}
          onExercisesChange={handleExercisesChange}
        />

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={handleDone} disabled={!hasExercises}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

