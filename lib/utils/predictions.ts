import { Set } from "@/types";
import { REP_PREDICTION } from "@/lib/constants/progression";

/**
 * Predict reps for the next set
 * First set: 80% of max effort or previous day's first set
 * Subsequent sets: Previous set minus 3 reps
 */
export function predictReps(
  setsToday: Set[],
  maxEffortReps: number,
  previousDayFirstSet?: number
): number {
  if (setsToday.length === 0) {
    // First set of the day
    if (previousDayFirstSet) {
      return previousDayFirstSet;
    }
    return Math.floor(maxEffortReps * REP_PREDICTION.FIRST_SET_PERCENTAGE);
  }

  // Subsequent sets: previous set - 3 reps (minimum 1)
  const lastSet = setsToday[setsToday.length - 1];
  return Math.max(1, lastSet.reps - REP_PREDICTION.SET_DECREMENT);
}

/**
 * Get the first set reps from the previous training day
 */
export function getPreviousDayFirstSet(allSets: Set[], todayDate: Date): number | undefined {
  // Filter out today's sets
  const todayStr = todayDate.toISOString().split("T")[0];
  const previousSets = allSets.filter((set) => {
    const setDate = new Date(set.logged_at).toISOString().split("T")[0];
    return setDate !== todayStr;
  });

  if (previousSets.length === 0) return undefined;

  // Sort by date descending
  previousSets.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());

  // Get the most recent training day
  const mostRecentDay = new Date(previousSets[0].logged_at).toISOString().split("T")[0];

  // Get all sets from that day
  const mostRecentDaySets = previousSets.filter(
    (set) => new Date(set.logged_at).toISOString().split("T")[0] === mostRecentDay
  );

  // Return the first set (lowest set_number)
  const firstSet = mostRecentDaySets.sort((a, b) => a.set_number - b.set_number)[0];
  return firstSet?.reps;
}

/**
 * Calculate suggested RPE for a set based on position in workout
 * First set: RPE 7-8
 * Middle sets: RPE 7-8
 * Last few sets (when close to target): RPE 8-9
 */
export function suggestRPE(
  currentReps: number,
  targetReps: number,
  setNumber: number
): number {
  // If already at or past target, suggest RPE 8-9
  if (currentReps >= targetReps) {
    return setNumber <= 2 ? 8 : 9;
  }

  // Calculate how close to target
  const remainingReps = targetReps - currentReps;
  const percentComplete = currentReps / targetReps;

  // First set should be moderate (RPE 7)
  if (setNumber === 1) return 7;

  // As workout progresses and target approaches, suggest higher RPE
  if (percentComplete >= 0.85) return 8;
  if (percentComplete >= 0.7) return 7;
  return 7;
}

/**
 * Calculate estimated sets needed to reach target
 */
export function estimateSetsToTarget(
  currentReps: number,
  targetReps: number,
  averageRepsPerSet: number = 10
): number {
  const remainingReps = Math.max(0, targetReps - currentReps);
  return Math.ceil(remainingReps / averageRepsPerSet);
}

/**
 * Calculate average reps per set from today's sets
 */
export function getAverageRepsPerSet(setsToday: Set[]): number {
  if (setsToday.length === 0) return 10; // Default assumption

  const totalReps = setsToday.reduce((sum, set) => sum + set.reps, 0);
  return Math.round(totalReps / setsToday.length);
}

