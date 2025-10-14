"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MovementCategory } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EXERCISE_VARIATIONS } from "@/lib/constants/exercises";
import { calculateInitialDailyTarget } from "@/lib/utils/calculations";
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
  const [maxReps, setMaxReps] = useState("");
  const [loading, setLoading] = useState(false);

  const exercises = EXERCISE_VARIATIONS[category];
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  const dailyTarget = maxReps ? calculateInitialDailyTarget(parseInt(maxReps)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedExercise || !maxReps || parseInt(maxReps) <= 0) {
      toast.error("Please select an exercise and enter your max reps");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const exerciseName = exercises.find((ex) => ex.id === selectedExercise)?.name || selectedExercise;

      // Check if movement already exists
      const { data: existing } = await supabase
        .from("movements")
        .select("id")
        .eq("user_id", userId)
        .eq("category", category)
        .single();

      if (existing) {
        // Update existing movement
        const { error: updateError } = await supabase
          .from("movements")
          .update({
            exercise_variation: selectedExercise,
            max_effort_reps: parseInt(maxReps),
            max_effort_date: new Date().toISOString(),
            daily_target: dailyTarget,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        // Insert new movement
        const { error: insertError } = await supabase.from("movements").insert({
          user_id: userId,
          category,
          exercise_variation: selectedExercise,
          max_effort_reps: parseInt(maxReps),
          max_effort_date: new Date().toISOString(),
          daily_target: dailyTarget,
          is_unlocked: true,
        });

        if (insertError) throw insertError;
      }

      toast.success(`${exerciseName} configured with ${dailyTarget} daily reps!`);
      router.push("/dashboard");
    } catch (error) {
      console.error("Error saving movement:", error);
      toast.error("Failed to save movement. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          <CardTitle className="text-2xl">{categoryName} Movement Setup</CardTitle>
          <CardDescription>
            Select your exercise and perform a max effort test to establish your baseline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">Select Exercise</label>
              <div className="grid gap-2">
                {exercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => setSelectedExercise(exercise.id)}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors text-left ${
                      selectedExercise === exercise.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div>
                      <span className="font-medium block">{exercise.name}</span>
                      {!exercise.isStandard && (
                        <span className="text-xs text-muted-foreground">Progression exercise</span>
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
                Perform {exercises.find((ex) => ex.id === selectedExercise)?.name || "your selected exercise"} until failure
              </p>
            </div>

            {maxReps && parseInt(maxReps) > 0 && (
              <div className="rounded-lg bg-primary/10 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Your daily target will be</p>
                <p className="text-3xl font-bold text-primary">{dailyTarget} reps</p>
                <p className="text-xs text-muted-foreground mt-1">(80% of your max effort)</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || !selectedExercise || !maxReps}
            >
              {loading ? "Saving..." : "Save Movement"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

