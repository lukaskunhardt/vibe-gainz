// Auto-progression threshold for non-standard exercises
export const AUTO_PROGRESSION_THRESHOLD = 20;

// Initial daily target is 80% of max effort
export const INITIAL_TARGET_PERCENTAGE = 0.8;

// Max effort test frequency (days)
export const MAX_EFFORT_TEST_FREQUENCY_DAYS = 7;

// Recovery score thresholds for volume adjustments
export const VOLUME_ADJUSTMENT_THRESHOLDS = {
  EXCELLENT: { min: 85, adjustment: 0.25 }, // +25%
  VERY_GOOD: { min: 70, adjustment: 0.15 }, // +15%
  GOOD: { min: 55, adjustment: 0.1 }, // +10%
  FAIR: { min: 40, adjustment: 0.05 }, // +5%
  MAINTAIN: { min: 20, adjustment: 0 }, // 0%
  DELOAD: { min: 0, adjustment: -0.125 }, // -12.5%
} as const;

// Recovery score component weights
export const RECOVERY_SCORE_WEIGHTS = {
  FIRST_SET_PERFORMANCE: 40,
  RPE_EFFICIENCY: 30,
  TARGET_ACHIEVEMENT: 20,
  CONSISTENCY: 10,
} as const;

// RPE efficiency scoring
export const RPE_EFFICIENCY_SCORING = {
  OPTIMAL_RPE_MIN: 6,
  OPTIMAL_RPE_MAX: 8,
  FULL_POINTS_RPE: 7,
} as const;

// Rep prediction constants
export const REP_PREDICTION = {
  FIRST_SET_PERCENTAGE: 0.8, // 80% of max effort for first set
  SET_DECREMENT: 3, // Reduce by 3 reps for subsequent sets
} as const;

// Weekly review constants
export const WEEKLY_REVIEW = {
  REVIEW_DAY: 1, // Monday (0 = Sunday, 1 = Monday, etc.)
  DAYS_IN_WEEK: 7,
  MINIMUM_DAYS_FOR_REVIEW: 4, // Minimum training days to generate review
} as const;

