export type MovementCategory = "push" | "pull" | "legs";

export interface Profile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Movement {
  id: string;
  user_id: string;
  category: MovementCategory;
  exercise_variation: string;
  max_effort_reps: number;
  max_effort_date: string;
  daily_target: number;
  is_unlocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Set {
  id: string;
  user_id: string;
  movement_id: string | null;
  category: MovementCategory;
  exercise_variation: string;
  reps: number;
  rpe: number;
  is_max_effort: boolean;
  set_number: number;
  logged_at: string;
  created_at: string;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  movement_id: string;
  category: MovementCategory;
  week_start_date: string;
  recovery_score: number;
  first_set_performance_score: number;
  rpe_efficiency_score: number;
  target_achievement_score: number;
  consistency_score: number;
  previous_daily_target: number;
  suggested_daily_target: number;
  chosen_daily_target: number;
  user_overrode_suggestion: boolean;
  created_at: string;
}

export interface MaxEffortPrompt {
  id: string;
  user_id: string;
  movement_id: string;
  category: MovementCategory;
  triggered_at: string;
  dismissed: boolean;
  completed: boolean;
  created_at: string;
}

export interface Readiness {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  score: number; // 1-5
  created_at: string;
}

export interface MovementTargetHistory {
  id: string;
  user_id: string;
  movement_id: string;
  category: MovementCategory;
  date: string; // YYYY-MM-DD
  target: number;
  created_at: string;
}
