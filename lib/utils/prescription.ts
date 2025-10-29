import { Set as WorkoutSet } from "@/types";

export type DailyPrescription = {
  sets: number;
  targetRPE: number;
  repsPerSet: number;
};

// Map readiness (1-5) to (sets, targetRPE)
function readinessToPlan(readiness: number | null | undefined): {
  sets: number;
  targetRPE: number;
} {
  switch (readiness) {
    case 5:
      return { sets: 3, targetRPE: 8 };
    case 4:
      return { sets: 2, targetRPE: 8 };
    case 3:
      return { sets: 1, targetRPE: 8 };
    case 2:
      return { sets: 1, targetRPE: 6 };
    case 1:
    default:
      return { sets: 1, targetRPE: 4 };
  }
}

// reps for a set at a target RPE given current max effort
export function repsForTargetRPE(maxEffortReps: number, targetRPE: number): number {
  const rir = Math.max(0, Math.min(9, 10 - targetRPE));
  return Math.max(1, Math.floor(maxEffortReps - rir));
}

export function getDailyPrescription(
  readiness: number | null | undefined,
  maxEffortReps: number
): DailyPrescription {
  const { sets, targetRPE } = readinessToPlan(readiness);
  const repsPerSet = repsForTargetRPE(maxEffortReps, targetRPE);
  return { sets, targetRPE, repsPerSet };
}

// Compute implied max from a single set using RIR = 10 - RPE
export function impliedMaxFromSet(reps: number, rpe: number, isMaxEffort = false): number {
  const { impliedMaxReps } = computeSetMetrics(reps, rpe, isMaxEffort);
  return impliedMaxReps;
}

// Given a list of sets, pick the best implied max (ignores max-effort flag on purpose; caller can filter)
export function bestImpliedMax(sets: WorkoutSet[]): number | null {
  if (!sets || sets.length === 0) return null;
  let best: number | null = null;
  for (const s of sets) {
    const implied = impliedMaxFromSet(s.reps, s.rpe, s.is_max_effort);
    if (best === null || implied > best) best = implied;
  }
  return best;
}

export function repsInReserveFromRPE(rpe: number | null | undefined, isMaxEffort: boolean): number {
  if (isMaxEffort) return 0;
  if (typeof rpe !== "number") return 0;
  return Math.max(0, Math.min(9, 10 - rpe));
}

export function computeSetMetrics(
  reps: number,
  rpe: number | null | undefined,
  isMaxEffort: boolean
): { rir: number; impliedMaxReps: number } {
  const rir = repsInReserveFromRPE(rpe, isMaxEffort);
  const impliedMaxReps = Math.max(0, reps + rir);
  return { rir, impliedMaxReps };
}
