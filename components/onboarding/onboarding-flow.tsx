"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MovementCategory } from "@/types";
import { EXERCISE_VARIATIONS } from "@/lib/constants/exercises";
import { calculateInitialDailyTarget } from "@/lib/utils/calculations";
import { Dumbbell, TrendingUp, Target } from "lucide-react";
import { toast } from "sonner";

interface OnboardingFlowProps {
  userId: string;
  userEmail: string;
}

type OnboardingStep = "welcome" | "push" | "pull" | "legs" | "complete";

export function OnboardingFlow({ userId, userEmail }: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [loading, setLoading] = useState(false);

  const totalSteps = 4;
  const currentStepNumber = {
    welcome: 0,
    push: 1,
    pull: 2,
    legs: 3,
    complete: 4,
  }[step];

  const progress = (currentStepNumber / totalSteps) * 100;

  const handleWelcomeNext = () => {
    setStep("push");
  };

  const handleMovementSubmit = async (
    category: MovementCategory,
    exerciseId: string,
    maxReps: number
  ) => {
    if (!exerciseId || maxReps <= 0) {
      toast.error("Please select an exercise and enter your max reps");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const dailyTarget = calculateInitialDailyTarget(maxReps);
      const exerciseName =
        EXERCISE_VARIATIONS[category].find((ex) => ex.id === exerciseId)?.name || exerciseId;

      // Insert movement
      const { error: movementError } = await supabase.from("movements").insert({
        user_id: userId,
        category,
        exercise_variation: exerciseId,
        max_effort_reps: maxReps,
        max_effort_date: new Date().toISOString(),
        daily_target: dailyTarget,
        is_unlocked: true,
      });

      if (movementError) throw movementError;

      // Move to next step
      if (category === "push") {
        setStep("pull");
      } else if (category === "pull") {
        setStep("legs");
      } else if (category === "legs") {
        // Complete onboarding
        await completeOnboarding();
      }

      toast.success(`${exerciseName} configured with ${dailyTarget} daily reps!`);
    } catch (error) {
      console.error("Error saving movement:", error);
      toast.error("Failed to save movement. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      const supabase = createClient();

      // Create or update profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        email: userEmail,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });

      if (profileError) throw profileError;

      setStep("complete");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Failed to complete onboarding. Please try again.");
    }
  };

  if (step === "welcome") {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Dumbbell className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl">Welcome to Vibe Gainz!</CardTitle>
          <CardDescription className="text-base">
            High-volume calisthenics training tracker with intelligent progression
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Target className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Automated Volume Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Set daily targets and track your progress across push, pull, and leg movements
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Smart Progression</h3>
                <p className="text-sm text-muted-foreground">
                  Weekly recovery scores guide your volume adjustments for optimal gains
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-semibold mb-2">Let&apos;s get started!</h4>
            <p className="text-sm text-muted-foreground">
              We&apos;ll set up your three core movements: push, pull, and legs. For each, you&apos;ll
              select an exercise and perform a max effort test to establish your baseline.
            </p>
          </div>
          <Button onClick={handleWelcomeNext} className="w-full" size="lg">
            Begin Setup
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "complete") {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
            <Dumbbell className="h-10 w-10 text-green-500" />
          </div>
          <CardTitle className="text-3xl">You&apos;re All Set!</CardTitle>
          <CardDescription className="text-base">
            Redirecting you to your dashboard...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={100} className="w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="mb-4">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Step {currentStepNumber} of {totalSteps}
          </p>
        </div>
        <CardTitle className="text-2xl capitalize">{step} Movement Setup</CardTitle>
        <CardDescription>
          Select your {step} exercise and perform a max effort test
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MovementSetupForm
          category={step as MovementCategory}
          onSubmit={(exerciseId, maxReps) => handleMovementSubmit(step as MovementCategory, exerciseId, maxReps)}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}

interface MovementSetupFormProps {
  category: MovementCategory;
  onSubmit: (exerciseId: string, maxReps: number) => void;
  loading: boolean;
}

function MovementSetupForm({ category, onSubmit, loading }: MovementSetupFormProps) {
  const [selectedExercise, setSelectedExercise] = useState("");
  const [maxReps, setMaxReps] = useState("");

  const exercises = EXERCISE_VARIATIONS[category];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedExercise, parseInt(maxReps));
  };

  const selectedExerciseName =
    exercises.find((ex) => ex.id === selectedExercise)?.name || "";
  const dailyTarget = maxReps ? calculateInitialDailyTarget(parseInt(maxReps)) : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium">Select Exercise</label>
        <div className="grid gap-2">
          {exercises.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => setSelectedExercise(exercise.id)}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                selectedExercise === exercise.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="font-medium">{exercise.name}</span>
              {!exercise.isStandard && (
                <span className="text-xs bg-muted px-2 py-1 rounded">Progression</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label htmlFor="maxReps" className="text-sm font-medium">
          Max Effort Reps
        </label>
        <input
          id="maxReps"
          type="number"
          min="1"
          value={maxReps}
          onChange={(e) => setMaxReps(e.target.value)}
          placeholder="Enter your max reps"
          className="w-full px-4 py-3 rounded-lg border bg-background text-2xl font-bold text-center"
          required
        />
        <p className="text-sm text-muted-foreground text-center">
          Perform {selectedExerciseName || "your selected exercise"} until failure
        </p>
      </div>

      {maxReps && parseInt(maxReps) > 0 && (
        <div className="rounded-lg bg-primary/10 p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Your daily target will be</p>
          <p className="text-3xl font-bold text-primary">{dailyTarget} reps</p>
          <p className="text-xs text-muted-foreground mt-1">
            (80% of your max effort)
          </p>
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={loading || !selectedExercise || !maxReps}>
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}

