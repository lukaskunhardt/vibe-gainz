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
 * Rules (step-based, automatic):
 * - Trivially Easy: if first non-max set reps >= target and first-set RPE <= 5 -> +5
 * - Easy: if total reps >= target and avg RPE <= 6 -> +3
 * - Good Zone: if total reps >= target and 6 < avg RPE <= 8 -> +2
 * - Strained: if total reps >= target and (avg RPE >= 8.5 or >=2 sets at RPE >= 9) -> -5
 * - Under Target: if total reps < target and avg RPE >= 8 -> -5; else maintain
 * - Max-effort-only day -> maintain
 * - High-set cap: if at least 3 sets and top 3 sets are RPE >= 8, do not increase. Only allow increases once
 *   at least 3 sets with RPE <= 6 are achieved (cap relaxed). This check is done via `capRelaxed` arg.
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

  // Readiness gate: if feeling low (<=2), hold. We avoid decreases to keep behavior simple.
  const readiness = typeof readinessScore === "number" ? readinessScore : 3;
  if (readiness <= 2) return { delta: 0, reason: "low readiness" };

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

  // Fatigue cap: if first three sets are all RPE >= 8, block increases unless relaxed
  const top3 = nonMax.slice(0, 3);
  const top3AllAtLeast8 = top3.length === 3 && top3.every((s) => s.rpe >= 8);
  const increaseBlockedByCap = top3AllAtLeast8 && !capRelaxed;

  if (!reached) return { delta: 0, reason: "target not reached" };

  const steps = {
    legs: { trivial: 5, easy: 3, manageable: 2 },
    push: { trivial: 3, easy: 2, manageable: 1 },
    pull: { trivial: 2, easy: 1, manageable: 1 },
  } as const;

  const cat = category;
  const catSteps = steps[cat];

  // Trivially easy: one set meets target at RPE <= 5
  if (setsToTarget === 1 && firstSetRPE !== null && firstSetRPE <= 5) {
    if (increaseBlockedByCap) return { delta: 0, reason: "cap active (3xRPE>=8)" };
    return { delta: catSteps.trivial, reason: "trivially easy" };
  }

  // Easy: within 2 sets and max RPE <= 6
  if (setsToTarget <= 2 && maxRPEUsed <= 6) {
    if (increaseBlockedByCap) return { delta: 0, reason: "cap active (3xRPE>=8)" };
    return { delta: catSteps.easy, reason: "easy" };
  }

  // Manageable: within 3 sets and max RPE <= 7
  if (setsToTarget <= 3 && maxRPEUsed <= 7) {
    if (increaseBlockedByCap) return { delta: 0, reason: "cap active (3xRPE>=8)" };
    return { delta: catSteps.manageable, reason: "manageable" };
  }

  // Otherwise, do not increase
  return { delta: 0, reason: "fatiguing or many sets" };
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
