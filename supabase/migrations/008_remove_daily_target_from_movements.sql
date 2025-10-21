-- Add composite index for efficient target lookups
CREATE INDEX IF NOT EXISTS idx_movement_target_history_lookup 
ON movement_target_history(movement_id, date DESC);

-- Backfill: Ensure all movements have a current entry in history table
-- This handles any movements that might not have a history entry yet
INSERT INTO movement_target_history (user_id, movement_id, category, date, target)
SELECT user_id, id, category, CURRENT_DATE, daily_target
FROM movements
WHERE id NOT IN (
  SELECT DISTINCT movement_id 
  FROM movement_target_history 
  WHERE date = CURRENT_DATE
)
ON CONFLICT (movement_id, date) DO NOTHING;

-- Remove daily_target column from movements table
ALTER TABLE movements DROP COLUMN IF EXISTS daily_target;

