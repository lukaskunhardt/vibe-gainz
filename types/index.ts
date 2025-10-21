import { MovementCategory } from "./database";

export * from "./database";

export interface ExerciseVariation {
  id: string;
  name: string;
  difficulty: number;
  isStandard: boolean;
}

export interface FormCues {
  cues: string[];
  videoUrl: string;
  gifUrl?: string; // Optional: Uploadthing GIF URL for exercise demonstration
}

export interface RecoveryScoreBreakdown {
  firstSetPerformance: number;
  rpeEfficiency: number;
  targetAchievement: number;
  consistency: number;
  total: number;
}

export interface VolumeAdjustment {
  percentage: number;
  newTarget: number;
}

export interface DailyProgress {
  category: MovementCategory;
  currentReps: number;
  targetReps: number;
  isComplete: boolean;
  hasMaxEffortPrompt: boolean;
}

export interface WeeklyData {
  sets: Array<{
    reps: number;
    rpe: number;
    logged_at: string;
    set_number: number;
  }>;
  dailyTarget: number;
  maxEffortReps: number;
}
