"use client";

import { MovementCategory } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EXERCISE_VARIATIONS, FORM_CUES } from "@/lib/constants/exercises";

interface ExerciseInfoContentProps {
  category: MovementCategory;
  exerciseId: string;
}

export function ExerciseInfoContent({ category, exerciseId }: ExerciseInfoContentProps) {
  const router = useRouter();
  const exercise = EXERCISE_VARIATIONS[category].find((ex) => ex.id === exerciseId);
  const formCues = FORM_CUES[exerciseId];

  if (!exercise) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <p className="mb-4 text-muted-foreground">Exercise not found</p>
        <Link href="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="space-y-6">
        {/* Exercise Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{exercise.name}</CardTitle>
            <CardDescription className="flex items-center gap-4">
              <span className="capitalize">{category} Movement</span>
              {exercise.isStandard ? (
                <span className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                  Standard Exercise
                </span>
              ) : (
                <span className="rounded bg-muted px-2 py-1 text-xs">Progression Exercise</span>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Video */}
        {formCues && (
          <Card>
            <CardHeader>
              <CardTitle>Form Video</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
                <iframe
                  src={formCues.videoUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`${exercise.name} form video`}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form Cues */}
        {formCues && (
          <Card>
            <CardHeader>
              <CardTitle>Form Cues</CardTitle>
              <CardDescription>Focus on these key points for proper technique</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {formCues.cues.map((cue, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-sm">{cue}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Progression Info */}
        {!exercise.isStandard && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle>Progression Path</CardTitle>
              <CardDescription>
                This is a progression exercise to build up to the standard variation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-background p-4">
                <p className="mb-3 text-sm text-muted-foreground">
                  <strong>When you reach 20+ reps on your max effort test,</strong> you&apos;ll
                  automatically progress to the next difficulty level. Keep pushing!
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXERCISE_VARIATIONS[category].map((ex) => (
                    <div
                      key={ex.id}
                      className={`rounded px-3 py-1.5 text-xs ${
                        ex.id === exerciseId
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
            </CardContent>
          </Card>
        )}

        {/* Training Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Training Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-2 font-semibold">Focus on the Eccentric</h4>
              <p className="text-sm text-muted-foreground">
                The lowering phase (eccentric) is crucial for building strength. Aim for a 3-second
                controlled descent on every rep.
              </p>
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Optimal RPE Range</h4>
              <p className="text-sm text-muted-foreground">
                For most sets, aim for RPE 6-8. This provides enough stimulus for growth while
                minimizing fatigue, allowing you to accumulate more volume throughout the week.
              </p>
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Avoid Training to Failure</h4>
              <p className="text-sm text-muted-foreground">
                Reserve RPE 10 (failure) for max effort tests only. Regular training to failure
                causes excessive fatigue and can limit your weekly volume, hindering long-term
                progress.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Link href={`/movement/${category}/select`}>
            <Button variant="outline" className="w-full">
              Change Exercise
            </Button>
          </Link>
          <Link href={`/movement/${category}/record`}>
            <Button className="w-full">Start Training</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
