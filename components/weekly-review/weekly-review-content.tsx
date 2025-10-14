"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MovementCategory } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { getPreviousWeekStart, getWeekDates, formatWeekRange } from "@/lib/utils/date-helpers";
import { calculateRecoveryScore, suggestVolumeAdjustment, getRecoveryScoreRating, getVolumeAdjustmentDescription } from "@/lib/utils/calculations";
import { RecoveryScoreGauge } from "./recovery-score-gauge";
import { ScoreBreakdown } from "./score-breakdown";

interface WeeklyReviewContentProps {
  userId: string;
  category: MovementCategory;
}

export function WeeklyReviewContent({ userId, category }: WeeklyReviewContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [movement, setMovement] = useState<{ id: string; daily_target: number; max_effort_reps: number } | null>(null);
  const [recoveryScore, setRecoveryScore] = useState<{
    firstSetPerformance: number;
    rpeEfficiency: number;
    targetAchievement: number;
    consistency: number;
    total: number;
  } | null>(null);
  const [suggestedTarget, setSuggestedTarget] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState(0);

  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  const previousWeekStart = getPreviousWeekStart();

  useEffect(() => {
    loadWeeklyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, category]);

  const loadWeeklyData = async () => {
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

      if (!movementData) {
        toast.error("Movement not configured");
        router.push("/dashboard");
        return;
      }

      setMovement(movementData);

      // Fetch previous week's sets
      const weekDates = getWeekDates(previousWeekStart);
      const weekStart = weekDates[0];
      const weekEnd = weekDates[weekDates.length - 1];
      weekEnd.setHours(23, 59, 59, 999);

      const { data: sets } = await supabase
        .from("sets")
        .select("*")
        .eq("user_id", userId)
        .eq("category", category)
        .gte("logged_at", weekStart.toISOString())
        .lte("logged_at", weekEnd.toISOString())
        .order("logged_at", { ascending: true });

      if (!sets || sets.length === 0) {
        toast.error("No data from previous week to review");
        router.push("/dashboard");
        return;
      }

      // Calculate recovery score
      const weeklyData = {
        sets: sets.map((s) => ({
          reps: s.reps,
          rpe: s.rpe,
          logged_at: s.logged_at,
          set_number: s.set_number,
        })),
        dailyTarget: movementData.daily_target,
        maxEffortReps: movementData.max_effort_reps,
      };

      const score = calculateRecoveryScore(weeklyData);
      setRecoveryScore(score);

      const adjustment = suggestVolumeAdjustment(score.total, movementData.daily_target);
      setSuggestedTarget(adjustment.newTarget);
      setSelectedTarget(adjustment.newTarget);
    } catch (error) {
      console.error("Error loading weekly data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!movement || !recoveryScore) return;

    setSaving(true);
    try {
      const supabase = createClient();

      // Insert weekly review
      const { error: reviewError } = await supabase.from("weekly_reviews").insert({
        user_id: userId,
        movement_id: movement.id,
        category,
        week_start_date: previousWeekStart,
        recovery_score: recoveryScore.total,
        first_set_performance_score: recoveryScore.firstSetPerformance,
        rpe_efficiency_score: recoveryScore.rpeEfficiency,
        target_achievement_score: recoveryScore.targetAchievement,
        consistency_score: recoveryScore.consistency,
        previous_daily_target: movement.daily_target,
        suggested_daily_target: suggestedTarget,
        chosen_daily_target: selectedTarget,
        user_overrode_suggestion: selectedTarget !== suggestedTarget,
      });

      if (reviewError) throw reviewError;

      // Update movement with new target
      const { error: updateError } = await supabase
        .from("movements")
        .update({
          daily_target: selectedTarget,
          updated_at: new Date().toISOString(),
        })
        .eq("id", movement.id);

      if (updateError) throw updateError;

      toast.success(`Weekly review saved! New target: ${selectedTarget} reps/day`);
      router.push("/dashboard");
    } catch (error) {
      console.error("Error saving review:", error);
      toast.error("Failed to save review. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Calculating recovery score...</p>
        </div>
      </div>
    );
  }

  if (!movement || !recoveryScore) {
    return null;
  }

  const rating = getRecoveryScoreRating(recoveryScore.total);
  const adjustment = suggestVolumeAdjustment(recoveryScore.total, movement.daily_target);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Weekly Review - {categoryName}</CardTitle>
            <CardDescription>
              Week of {formatWeekRange(previousWeekStart)}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Recovery Score */}
        <Card>
          <CardHeader>
            <CardTitle>Recovery Score</CardTitle>
            <CardDescription>Overall assessment of last week&apos;s performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RecoveryScoreGauge score={recoveryScore.total} />
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${rating.color}`}>{rating.rating}</div>
              <p className="text-sm text-muted-foreground mt-1">{rating.description}</p>
            </div>

            <ScoreBreakdown breakdown={recoveryScore} />
          </CardContent>
        </Card>

        {/* Volume Adjustment */}
        <Card>
          <CardHeader>
            <CardTitle>Volume Adjustment</CardTitle>
            <CardDescription>Suggested daily target based on recovery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Target</span>
                <span className="text-2xl font-bold">{movement.daily_target} reps</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Suggested Target</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">{suggestedTarget} reps</span>
                  {adjustment.percentage > 0 && (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  )}
                  {adjustment.percentage < 0 && (
                    <TrendingDown className="h-5 w-5 text-orange-500" />
                  )}
                  {adjustment.percentage === 0 && (
                    <Minus className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {getVolumeAdjustmentDescription(adjustment.percentage)}
              </p>
            </div>

            {/* Manual Override */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Adjust Target (Optional)
              </label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedTarget(Math.max(1, selectedTarget - 5))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">
                  <div className="text-4xl font-bold">{selectedTarget}</div>
                  <div className="text-xs text-muted-foreground">reps/day</div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedTarget(selectedTarget + 5)}
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </div>
              {selectedTarget !== suggestedTarget && (
                <p className="text-xs text-orange-500 text-center">
                  You&apos;re overriding the suggested target
                </p>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full"
              size="lg"
            >
              {saving ? "Saving..." : "Complete Review"}
            </Button>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Recovery Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <strong>High recovery scores (85+):</strong> Your body is adapting well. Feel free to
              increase volume aggressively.
            </p>
            <p>
              <strong>Medium scores (40-85):</strong> Maintain or slightly increase volume. Monitor
              how you feel.
            </p>
            <p>
              <strong>Low scores (&lt;40):</strong> Consider reducing volume to allow better recovery.
              Check sleep, nutrition, and stress levels.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

