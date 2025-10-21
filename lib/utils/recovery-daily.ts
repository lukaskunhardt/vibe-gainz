import { MovementCategory, Set as WorkoutSet } from "@/types";

type DaySummary = {
  hasNonMaxSets: boolean;
  totalReps: number;
  avgRPE: number;
  firstSetReps: number | null;
  firstSetRPE: number | null;
  setsCount: number;
  top3AllAtLeast8: boolean; // three or more sets and first three are RPE >= 8
  top3AllAtMost6: boolean; // three or more sets and first three are RPE <= 6
  twoSetsAtLeast9: boolean; // at least two sets with RPE >= 9
};

function summarizeDay(sets: WorkoutSet[]): DaySummary {
  const nonMax = sets.filter((s) => !s.is_max_effort).sort((a, b) => a.set_number - b.set_number);
  const hasNonMaxSets = nonMax.length > 0;
  if (!hasNonMaxSets) {
    return {
      hasNonMaxSets: false,
      totalReps: 0,
      avgRPE: 0,
      firstSetReps: null,
      firstSetRPE: null,
      setsCount: 0,
      top3AllAtLeast8: false,
      top3AllAtMost6: false,
      twoSetsAtLeast9: false,
    };
  }

  const totalReps = nonMax.reduce((sum, s) => sum + s.reps, 0);
  const avgRPE = nonMax.reduce((sum, s) => sum + s.rpe, 0) / nonMax.length;
  const first = nonMax[0];
  const top3 = nonMax.slice(0, 3);
  const top3AllAtLeast8 = top3.length === 3 && top3.every((s) => s.rpe >= 8);
  const top3AllAtMost6 = top3.length === 3 && top3.every((s) => s.rpe <= 6);
  const twoSetsAtLeast9 = nonMax.filter((s) => s.rpe >= 9).length >= 2;

  return {
    hasNonMaxSets: true,
    totalReps,
    avgRPE,
    firstSetReps: first?.reps ?? null,
    firstSetRPE: first?.rpe ?? null,
    setsCount: nonMax.length,
    top3AllAtLeast8,
    top3AllAtMost6,
    twoSetsAtLeast9,
  };
}

export type DailyAdjustment = {
  delta: number; // positive to increase, negative to decrease, 0 to maintain
  reason: string;
};

/**
 * Suggest next-day target delta based on a single day's work and the current target.
 *
 * New logic prioritizes set efficiency over absolute RPE:
 * - Fewer sets to hit target = more efficient = should increase
 * - RPE is a secondary check to avoid pushing too hard
 * - Readiness score modulates aggressiveness of increases
 *
 * Rules:
 * - Low readiness (≤2): block all increases
 * - Target not reached: maintain
 * - 1 set hits target: increase unless RPE 10
 * - 2 sets hit target: increase unless RPE 9+
 * - 3 sets hit target: increase only if RPE ≤7
 * - 4+ sets hit target: maintain (inefficient)
 * - High readiness (4-5): be more aggressive with increases
 */
export function suggestDailyTargetDelta(
  setsYesterday: WorkoutSet[],
  currentTarget: number,
  capRelaxed: boolean,
  category: MovementCategory,
  readinessScore?: number | null
): DailyAdjustment {
  const d = summarizeDay(setsYesterday);
  if (!d.hasNonMaxSets) return { delta: 0, reason: "max-effort only or no training sets" };

  // Readiness gate: if feeling low (≤2), block increases
  const readiness = typeof readinessScore === "number" ? readinessScore : 3;
  if (readiness <= 2) return { delta: 0, reason: "low readiness - need recovery" };

  // Determine sets needed to reach target and RPE within those sets
  const nonMax = setsYesterday
    .filter((s) => !s.is_max_effort)
    .sort((a, b) => a.set_number - b.set_number);
  let acc = 0;
  const used: WorkoutSet[] = [];
  for (const s of nonMax) {
    if (acc >= currentTarget) break;
    used.push(s);
    acc += s.reps;
  }
  const reached = acc >= currentTarget;
  const setsToTarget = used.length;
  const firstSet = used[0];
  const firstSetRPE = firstSet?.rpe ?? null;
  const maxRPEUsed = used.reduce((mx, s) => Math.max(mx, s.rpe), 0);

  if (!reached) return { delta: 0, reason: "target not reached" };

  // Base step sizes by category
  const steps = {
    legs: { big: 5, medium: 3, small: 2 },
    push: { big: 3, medium: 2, small: 1 },
    pull: { big: 2, medium: 1, small: 1 },
  } as const;

  const catSteps = steps[category];
  
  // High readiness bonus: upgrade step size when feeling great
  const highReadiness = readiness >= 4;

  // ONE SET TO TARGET: Very efficient, almost always increase
  if (setsToTarget === 1 && firstSetRPE !== null) {
    // RPE 10: at absolute limit, maintain
    if (firstSetRPE >= 10) {
      return { delta: 0, reason: "1 set but at RPE 10 (maxed out)" };
    }
    // RPE 9: small increase (near limit but room to grow)
    if (firstSetRPE >= 9) {
      const step = highReadiness ? catSteps.medium : catSteps.small;
      return { delta: step, reason: "1 set at RPE 9 (efficient but hard)" };
    }
    // RPE 8: medium increase (good training zone)
    if (firstSetRPE >= 8) {
      const step = highReadiness ? catSteps.big : catSteps.medium;
      return { delta: step, reason: "1 set at RPE 8 (efficient)" };
    }
    // RPE ≤7: big increase (very easy)
    const step = catSteps.big;
    return { delta: step, reason: "1 set at RPE ≤7 (trivially easy)" };
  }

  // TWO SETS TO TARGET: Efficient, increase unless RPE very high
  if (setsToTarget === 2) {
    // RPE 9+: maintain (struggling)
    if (maxRPEUsed >= 9) {
      return { delta: 0, reason: "2 sets but max RPE ≥9 (struggling)" };
    }
    // RPE 8: small to medium increase
    if (maxRPEUsed >= 8) {
      const step = highReadiness ? catSteps.medium : catSteps.small;
      return { delta: step, reason: "2 sets at RPE 8 (manageable)" };
    }
    // RPE ≤7: medium to big increase
    const step = highReadiness ? catSteps.big : catSteps.medium;
    return { delta: step, reason: "2 sets at RPE ≤7 (easy)" };
  }

  // THREE SETS TO TARGET: Moderate efficiency, be conservative
  if (setsToTarget === 3) {
    // RPE 8+: maintain (taking too much effort)
    if (maxRPEUsed >= 8) {
      return { delta: 0, reason: "3 sets at RPE ≥8 (fatiguing)" };
    }
    // RPE ≤7: small increase
    const step = highReadiness ? catSteps.medium : catSteps.small;
    return { delta: step, reason: "3 sets at RPE ≤7 (manageable)" };
  }

  // FOUR OR MORE SETS: Inefficient, maintain
  return { delta: 0, reason: `${setsToTarget} sets needed (inefficient)` };
}

/**
 * Decide whether the high-set cap (3x RPE >= 8) can be relaxed.
 * For simplicity and clarity, treat the cap as relaxed if the immediate previous day
 * (yesterday) already achieved at least 3 sets with RPE <= 6. This avoids multi-day state.
 * If you prefer a stricter rule, require two consecutive days by checking dayMinus2 too.
 */
export function isCapRelaxed(setsYesterday: WorkoutSet[], setsDayMinus2?: WorkoutSet[]): boolean {
  const y = summarizeDay(setsYesterday);
  if (y.hasNonMaxSets && y.top3AllAtMost6) return true;
  if (setsDayMinus2 && setsDayMinus2.length > 0) {
    const d2 = summarizeDay(setsDayMinus2);
    if (d2.hasNonMaxSets && d2.top3AllAtMost6) return true;
  }
  return false;
}
