"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MovementCategory } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EXERCISE_VARIATIONS, FORM_CUES } from "@/lib/constants/exercises";
import { ArrowLeft, CheckCircle, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  getNextExerciseForCategory,
  updateExerciseLastUsed,
  getActiveExercises,
} from "@/lib/utils/exercise-rotation";

interface DailyExerciseSelectionContentProps {
  userId: string;
  category: MovementCategory;
}

export function DailyExerciseSelectionContent({
  userId,
  category,
}: DailyExerciseSelectionContentProps) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [scheduledExercise, setScheduledExercise] = useState<string | null>(null);
  const [activeExerciseIds, setActiveExerciseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const exercises = EXERCISE_VARIATIONS[category];
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    loadExerciseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, category]);

  const loadExerciseData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const exerciseField = `${category}_exercise_id`;

      // Check if exercise already selected for today
      const { data: dailyStats } = await supabase
        .from("daily_user_stats")
        .select(exerciseField)
        .eq("user_id", userId)
        .eq("date", today)
        .maybeSingle();

      // Get user's active exercises
      const activeMovements = await getActiveExercises(userId, category);
      const activeIds = activeMovements.map((m) => m.exercise_variation);
      setActiveExerciseIds(activeIds);

      const selectedExercise =
        dailyStats && typeof dailyStats === "object" && exerciseField in dailyStats
          ? (dailyStats[exerciseField as keyof typeof dailyStats] as string | null)
          : null;

      if (selectedExercise) {
        // Exercise already selected today
        setScheduledExercise(selectedExercise);
      } else {
        // Get next exercise based on rotation
        const nextExercise = await getNextExerciseForCategory(userId, category);
        setScheduledExercise(nextExercise);
      }
    } catch (error) {
      console.error("Error loading exercise data:", error);
      toast.error("Failed to load exercises");
    } finally {
      setLoading(false);
    }
  };

  const handleExerciseSelect = async (exerciseId: string) => {
    setSelecting(true);
    setSelectedExercise(exerciseId);

    try {
      const supabase = createClient();
      const exerciseField = `${category}_exercise_id`;

      // Upsert into daily_user_stats
      const { error } = await supabase.from("daily_user_stats").upsert(
        {
          user_id: userId,
          date: today,
          [exerciseField]: exerciseId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,date",
        }
      );

      if (error) throw error;

      // Update last_used_date for rotation (only if it's the scheduled exercise)
      if (exerciseId === scheduledExercise) {
        await updateExerciseLastUsed(userId, category, exerciseId, today);
      }

      const exerciseName = exercises.find((ex) => ex.id === exerciseId)?.name || exerciseId;
      toast.success(`${exerciseName} selected for today!`);

      // Navigate to recording screen
      router.push(`/movement/${category}/record`);
    } catch (error) {
      console.error("Error selecting exercise:", error);
      toast.error("Failed to select exercise. Please try again.");
      setSelecting(false);
      setSelectedExercise(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-4">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Filter to show only active exercises
  const displayExercises = exercises.filter((ex) => activeExerciseIds.includes(ex.id));

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Select Today&apos;s {categoryName} Exercise</h1>
        <p className="text-muted-foreground">
          {scheduledExercise
            ? "Your scheduled exercise is highlighted. You can also override with any other active exercise."
            : "Choose the exercise you'll perform for all your sets today."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayExercises.map((exercise) => {
          const formCues = FORM_CUES[exercise.id];
          const isSelected = selectedExercise === exercise.id;
          const isScheduled = scheduledExercise === exercise.id;

          return (
            <Card
              key={exercise.id}
              className={`group cursor-pointer overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : isScheduled
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
              }`}
            >
              <button
                type="button"
                onClick={() => handleExerciseSelect(exercise.id)}
                disabled={selecting}
                className="w-full text-left transition-opacity disabled:opacity-50"
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
                  {isScheduled && !isSelected && (
                    <div className="absolute right-2 top-2">
                      <Badge variant="default" className="gap-1">
                        <Star className="h-3 w-3" />
                        Scheduled
                      </Badge>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/80">
                      <CheckCircle className="h-16 w-16 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Exercise Info */}
                <CardContent className="p-4">
                  <h3 className="font-semibold leading-tight">{exercise.name}</h3>

                  {!exercise.isStandard && (
                    <p className="text-xs text-muted-foreground">Progression exercise</p>
                  )}

                  {/* Key form cue */}
                  {formCues && formCues.cues.length > 0 && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {formCues.cues[0]}
                    </p>
                  )}
                </CardContent>
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
