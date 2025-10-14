import {
  RecoveryScoreBreakdown,
  VolumeAdjustment,
  WeeklyData,
  ExerciseVariation,
  MovementCategory,
} from "@/types";
import {
  INITIAL_TARGET_PERCENTAGE,
  VOLUME_ADJUSTMENT_THRESHOLDS,
  RECOVERY_SCORE_WEIGHTS,
  RPE_EFFICIENCY_SCORING,
  AUTO_PROGRESSION_THRESHOLD,
} from "@/lib/constants/progression";
import { getNextDifficultyExercise } from "@/lib/constants/exercises";
import { parseISO, isSameDay } from "date-fns";

/**
 * Calculate initial daily target from max effort reps
 * Returns 80% of max effort, rounded down
 */
export function calculateInitialDailyTarget(maxEffortReps: number): number {
  return Math.floor(maxEffortReps * INITIAL_TARGET_PERCENTAGE);
}

/**
 * Calculate recovery score from weekly data
 * Returns breakdown of all score components and total
 */
export function calculateRecoveryScore(data: WeeklyData): RecoveryScoreBreakdown {
  const firstSetScore = calculateFirstSetPerformanceScore(data);
  const rpeScore = calculateRPEEfficiencyScore(data);
  const targetScore = calculateTargetAchievementScore(data);
  const consistencyScore = calculateConsistencyScore(data);

  return {
    firstSetPerformance: firstSetScore,
    rpeEfficiency: rpeScore,
    targetAchievement: targetScore,
    consistency: consistencyScore,
    total: firstSetScore + rpeScore + targetScore + consistencyScore,
  };
}

/**
 * Calculate first set performance score (max 40 points)
 * Compares average first set performance to max effort
 */
function calculateFirstSetPerformanceScore(data: WeeklyData): number {
  const { sets, maxEffortReps } = data;

  // Group sets by day
  const setsByDay: Record<string, typeof sets> = {};
  sets.forEach((set) => {
    const day = set.logged_at.split("T")[0];
    if (!setsByDay[day]) setsByDay[day] = [];
    setsByDay[day].push(set);
  });

  // Get first set of each day
  const firstSets = Object.values(setsByDay).map((daySets) =>
    daySets.sort((a, b) => a.set_number - b.set_number)[0]
  );

  if (firstSets.length === 0) return 0;

  // Calculate average first set reps
  const avgFirstSetReps =
    firstSets.reduce((sum, set) => sum + set.reps, 0) / firstSets.length;

  // Score based on percentage of max effort
  const percentage = avgFirstSetReps / maxEffortReps;

  if (percentage >= 0.85) return RECOVERY_SCORE_WEIGHTS.FIRST_SET_PERFORMANCE; // 40 points
  if (percentage >= 0.75) return 35;
  if (percentage >= 0.65) return 28;
  if (percentage >= 0.55) return 20;
  if (percentage >= 0.45) return 12;
  return 5;
}

/**
 * Calculate RPE efficiency score (max 30 points)
 * Rewards training in the optimal RPE range (6-8)
 */
function calculateRPEEfficiencyScore(data: WeeklyData): number {
  const { sets } = data;
  if (sets.length === 0) return 0;

  // Count sets in optimal RPE range
  const optimalRPESets = sets.filter(
    (set) =>
      set.rpe >= RPE_EFFICIENCY_SCORING.OPTIMAL_RPE_MIN &&
      set.rpe <= RPE_EFFICIENCY_SCORING.OPTIMAL_RPE_MAX
  ).length;

  const percentage = optimalRPESets / sets.length;

  if (percentage >= 0.9) return RECOVERY_SCORE_WEIGHTS.RPE_EFFICIENCY; // 30 points
  if (percentage >= 0.8) return 26;
  if (percentage >= 0.7) return 22;
  if (percentage >= 0.6) return 18;
  if (percentage >= 0.5) return 14;
  if (percentage >= 0.4) return 10;
  return Math.floor(percentage * 20);
}

/**
 * Calculate target achievement score (max 20 points)
 * Based on how often daily targets were met
 */
function calculateTargetAchievementScore(data: WeeklyData): number {
  const { sets, dailyTarget } = data;

  // Group sets by day
  const setsByDay: Record<string, typeof sets> = {};
  sets.forEach((set) => {
    const day = set.logged_at.split("T")[0];
    if (!setsByDay[day]) setsByDay[day] = [];
    setsByDay[day].push(set);
  });

  const days = Object.keys(setsByDay);
  if (days.length === 0) return 0;

  // Count days where target was met
  const daysMetTarget = days.filter((day) => {
    const totalReps = setsByDay[day].reduce((sum, set) => sum + set.reps, 0);
    return totalReps >= dailyTarget;
  }).length;

  const percentage = daysMetTarget / days.length;

  if (percentage >= 0.95) return RECOVERY_SCORE_WEIGHTS.TARGET_ACHIEVEMENT; // 20 points
  if (percentage >= 0.85) return 18;
  if (percentage >= 0.75) return 16;
  if (percentage >= 0.65) return 14;
  if (percentage >= 0.5) return 11;
  return Math.floor(percentage * 20);
}

/**
 * Calculate consistency score (max 10 points)
 * Based on number of training days in the week
 */
function calculateConsistencyScore(data: WeeklyData): number {
  const { sets } = data;

  // Count unique training days
  const uniqueDays = new Set(sets.map((set) => set.logged_at.split("T")[0])).size;

  if (uniqueDays >= 6) return RECOVERY_SCORE_WEIGHTS.CONSISTENCY; // 10 points
  if (uniqueDays >= 5) return 8;
  if (uniqueDays >= 4) return 6;
  if (uniqueDays >= 3) return 4;
  if (uniqueDays >= 2) return 2;
  return uniqueDays > 0 ? 1 : 0;
}

/**
 * Suggest volume adjustment based on recovery score
 */
export function suggestVolumeAdjustment(
  recoveryScore: number,
  currentTarget: number
): VolumeAdjustment {
  let adjustment: number = VOLUME_ADJUSTMENT_THRESHOLDS.DELOAD.adjustment;

  if (recoveryScore >= VOLUME_ADJUSTMENT_THRESHOLDS.EXCELLENT.min) {
    adjustment = VOLUME_ADJUSTMENT_THRESHOLDS.EXCELLENT.adjustment;
  } else if (recoveryScore >= VOLUME_ADJUSTMENT_THRESHOLDS.VERY_GOOD.min) {
    adjustment = VOLUME_ADJUSTMENT_THRESHOLDS.VERY_GOOD.adjustment;
  } else if (recoveryScore >= VOLUME_ADJUSTMENT_THRESHOLDS.GOOD.min) {
    adjustment = VOLUME_ADJUSTMENT_THRESHOLDS.GOOD.adjustment;
  } else if (recoveryScore >= VOLUME_ADJUSTMENT_THRESHOLDS.FAIR.min) {
    adjustment = VOLUME_ADJUSTMENT_THRESHOLDS.FAIR.adjustment;
  } else if (recoveryScore >= VOLUME_ADJUSTMENT_THRESHOLDS.MAINTAIN.min) {
    adjustment = VOLUME_ADJUSTMENT_THRESHOLDS.MAINTAIN.adjustment;
  }

  return {
    percentage: adjustment,
    newTarget: Math.max(1, Math.floor(currentTarget * (1 + adjustment))),
  };
}

/**
 * Check if exercise should auto-progress to next difficulty
 * Only for non-standard exercises that exceed threshold
 */
export function shouldAutoProgress(
  exercise: ExerciseVariation,
  lastMaxEffort: number,
  category: MovementCategory
): ExerciseVariation | null {
  if (exercise.isStandard) return null;
  if (lastMaxEffort <= AUTO_PROGRESSION_THRESHOLD) return null;

  return getNextDifficultyExercise(exercise, category);
}

/**
 * Get volume adjustment description for UI
 */
export function getVolumeAdjustmentDescription(percentage: number): string {
  if (percentage >= 0.25) return "Increase by 25% - Excellent recovery!";
  if (percentage >= 0.15) return "Increase by 15% - Great progress!";
  if (percentage >= 0.1) return "Increase by 10% - Good work!";
  if (percentage >= 0.05) return "Increase by 5% - Steady gains!";
  if (percentage === 0) return "Maintain current volume";
  if (percentage <= -0.125) return "Decrease by 12.5% - Focus on recovery";
  return "Adjust volume";
}

/**
 * Get recovery score rating for UI
 */
export function getRecoveryScoreRating(score: number): {
  rating: string;
  color: string;
  description: string;
} {
  if (score >= 85) {
    return {
      rating: "Excellent",
      color: "text-green-600",
      description: "Outstanding recovery and performance!",
    };
  }
  if (score >= 70) {
    return {
      rating: "Very Good",
      color: "text-green-500",
      description: "Great recovery, keep it up!",
    };
  }
  if (score >= 55) {
    return {
      rating: "Good",
      color: "text-blue-500",
      description: "Solid progress and recovery.",
    };
  }
  if (score >= 40) {
    return {
      rating: "Fair",
      color: "text-yellow-500",
      description: "Recovery is adequate, room for improvement.",
    };
  }
  if (score >= 20) {
    return {
      rating: "Needs Improvement",
      color: "text-orange-500",
      description: "Focus on recovery and consistency.",
    };
  }
  return {
    rating: "Poor",
    color: "text-red-500",
    description: "Prioritize recovery and reduce volume.",
  };
}

