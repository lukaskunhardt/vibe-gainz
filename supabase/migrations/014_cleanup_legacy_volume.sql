-- Drop legacy columns from movements now that exercise_status owns PR data
ALTER TABLE movements
  DROP COLUMN IF EXISTS max_effort_reps,
  DROP COLUMN IF EXISTS max_effort_date;

-- Remove obsolete tables related to daily target workflow
DROP TABLE IF EXISTS movement_target_history;
DROP TABLE IF EXISTS weekly_reviews;
DROP TABLE IF EXISTS max_effort_prompts;

