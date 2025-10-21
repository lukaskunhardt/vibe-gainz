"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MovementCategory } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EXERCISE_VARIATIONS, FORM_CUES } from "@/lib/constants/exercises";
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle2, CheckCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useIsDesktop } from "@/lib/hooks/use-media-query";

interface MovementSelectionContentProps {
  userId: string;
  category: MovementCategory;
}

export function MovementSelectionContent({ userId, category }: MovementSelectionContentProps) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [currentExercise, setCurrentExercise] = useState<string | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
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
        .select("id, exercise_variation")
        .eq("user_id", userId)
        .eq("category", category)
        .single();

      // If no movement exists, this is initial setup (onboarding)
      setIsInitialSetup(!movement);

      // Set current exercise and expand it by default
      if (movement?.exercise_variation) {
        setCurrentExercise(movement.exercise_variation);
        setExpandedExercise(movement.exercise_variation);
      }
    } catch (error) {
      console.error("Error checking movement:", error);
    } finally {
      setCheckingMovement(false);
    }
  };

  const handleExerciseSelect = async (exerciseId: string) => {
    if (isInitialSetup) {
      // Initial setup: Redirect to max effort test
      router.push(`/movement/${category}/record?mode=max-effort&exercise=${exerciseId}`);
    } else {
      // Changing exercise: Just update the movement record
      setLoading(true);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("movements")
          .update({
            exercise_variation: exerciseId,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("category", category);

        if (error) throw error;

        const exerciseName = exercises.find((ex) => ex.id === exerciseId)?.name || exerciseId;
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

  const toggleExpanded = (exerciseId: string) => {
    setExpandedExercise(expandedExercise === exerciseId ? null : exerciseId);
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
              : `${isDesktop ? "Click" : "Tap"} an exercise to select it, or expand to view form details.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checkingMovement ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {exercises.map((exercise) => {
                const isExpanded = expandedExercise === exercise.id;
                const isCurrent = currentExercise === exercise.id;
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
                      onClick={() => handleExerciseSelect(exercise.id)}
                      disabled={loading}
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
                                Selected
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
                              <strong>Optimal RPE Range:</strong> For most sets, aim for RPE 6-8.
                              This provides enough stimulus while minimizing fatigue.
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
