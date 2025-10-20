"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MovementCategory } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EXERCISE_VARIATIONS } from "@/lib/constants/exercises";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface MovementSelectionContentProps {
  userId: string;
  category: MovementCategory;
}

export function MovementSelectionContent({ userId, category }: MovementSelectionContentProps) {
  const router = useRouter();
  const [selectedExercise, setSelectedExercise] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [checkingMovement, setCheckingMovement] = useState(true);

  const exercises = EXERCISE_VARIATIONS[category];
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

  useEffect(() => {
    checkExistingMovement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, category]);

  const checkExistingMovement = async () => {
    setCheckingMovement(true);
    try {
      const supabase = createClient();
      const { data: movement } = await supabase
        .from("movements")
        .select("id")
        .eq("user_id", userId)
        .eq("category", category)
        .single();

      // If no movement exists, this is initial setup (onboarding)
      setIsInitialSetup(!movement);
    } catch (error) {
      console.error("Error checking movement:", error);
    } finally {
      setCheckingMovement(false);
    }
  };

  const handleExerciseSelect = (exerciseId: string) => {
    setSelectedExercise(exerciseId);
  };

  const handleContinue = async () => {
    if (!selectedExercise) {
      toast.error("Please select an exercise first");
      return;
    }

    if (isInitialSetup) {
      // Initial setup: Redirect to max effort test
      router.push(`/movement/${category}/record?mode=max-effort&exercise=${selectedExercise}`);
    } else {
      // Changing exercise: Just update the movement record
      setLoading(true);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("movements")
          .update({
            exercise_variation: selectedExercise,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("category", category);

        if (error) throw error;

        const exerciseName =
          exercises.find((ex) => ex.id === selectedExercise)?.name || selectedExercise;
        toast.success(`Exercise changed to ${exerciseName}`);
        router.push("/dashboard");
      } catch (error) {
        console.error("Error updating exercise:", error);
        toast.error("Failed to update exercise. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

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
          <CardTitle className="text-2xl">
            {isInitialSetup ? `${categoryName} Movement Setup` : `Change ${categoryName} Exercise`}
          </CardTitle>
          <CardDescription>
            {isInitialSetup
              ? "Select an exercise you can perform at least 10 repetitions of with good form. You'll perform a max effort test next to establish your baseline."
              : "Select a different exercise variation. You can switch between exercises without affecting your daily target."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checkingMovement ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">Select Exercise</label>
                <div className="grid gap-2">
                  {exercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => handleExerciseSelect(exercise.id)}
                      className={`flex items-center justify-between rounded-lg border-2 p-4 text-left transition-colors ${
                        selectedExercise === exercise.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div>
                        <span className="block font-medium">{exercise.name}</span>
                        {!exercise.isStandard && (
                          <span className="text-xs text-muted-foreground">
                            Progression exercise
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/movement/${category}/${exercise.id}/info`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary hover:text-primary/80"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    </button>
                  ))}
                </div>
              </div>

              {selectedExercise && isInitialSetup && (
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                  <p className="mb-2 text-sm font-medium">Next Step:</p>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll perform a max effort test for{" "}
                    {exercises.find((ex) => ex.id === selectedExercise)?.name}. Do as many quality
                    reps as you can until complete failure. This establishes your baseline and sets
                    your daily target at 80% of your max effort.
                  </p>
                </div>
              )}

              {selectedExercise && !isInitialSetup && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                  <p className="text-sm text-muted-foreground">
                    Switching to {exercises.find((ex) => ex.id === selectedExercise)?.name}. Your
                    daily target and progress will remain unchanged.
                  </p>
                </div>
              )}

              <Button
                onClick={handleContinue}
                className="w-full"
                size="lg"
                disabled={!selectedExercise || loading}
              >
                {loading
                  ? "Updating..."
                  : isInitialSetup
                    ? "Continue to Max Effort Test"
                    : "Change Exercise"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
