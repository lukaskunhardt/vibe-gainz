-- Add RIR and implied max columns to sets
ALTER TABLE sets
  ADD COLUMN rir SMALLINT,
  ADD COLUMN implied_max_reps INTEGER;

ALTER TABLE sets
  ADD CONSTRAINT sets_rir_range CHECK (rir >= 0 AND rir <= 9),
  ADD CONSTRAINT sets_implied_nonnegative CHECK (implied_max_reps >= 0);

-- Backfill existing rows based on stored reps and RPE
UPDATE sets
SET
  rir = CASE
    WHEN is_max_effort THEN 0
    WHEN rpe IS NULL THEN 0
    ELSE GREATEST(0, LEAST(9, 10 - rpe))
  END,
  implied_max_reps = CASE
    WHEN reps IS NULL THEN 0
    WHEN is_max_effort OR rpe IS NULL THEN reps
    ELSE reps + GREATEST(0, LEAST(9, 10 - rpe))
  END;

ALTER TABLE sets
  ALTER COLUMN rir SET NOT NULL,
  ALTER COLUMN implied_max_reps SET NOT NULL;
