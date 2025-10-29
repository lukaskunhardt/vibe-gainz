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
  rotation_order: number;
  last_used_date: string | null;
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
  rir: number;
  implied_max_reps: number;
}

export interface Readiness {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  score: number; // 1-5
  created_at: string;
}

export interface ExerciseStatus {
  id: string;
  user_id: string;
  exercise_id: string;
  current_pr_reps: number;
  current_pr_tested_at: string | null;
  current_pr_set_id: string | null;
  latest_implied_max_reps: number | null;
  latest_implied_at: string | null;
  latest_implied_set_id: string | null;
  prompt_pending: boolean;
  created_at: string;
  updated_at: string;
}

export interface BodyWeight {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  weight_kg: number;
  created_at: string;
}

export interface DailyUserStats {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  push_exercise_id: string | null;
  pull_exercise_id: string | null;
  legs_exercise_id: string | null;
  readiness_score: number | null; // 1-5
  body_weight_kg: number | null;
  created_at: string;
  updated_at: string;
}
