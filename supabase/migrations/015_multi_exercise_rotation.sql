-- Enable multiple exercises per category by modifying movements table structure
-- This allows users to configure exercise rotation per category

-- Drop the unique constraint that limited one exercise per category
ALTER TABLE movements DROP CONSTRAINT IF EXISTS movements_user_id_category_key;

-- Add new columns for rotation management
ALTER TABLE movements 
  ADD COLUMN IF NOT EXISTS rotation_order INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_used_date DATE;

-- Drop the is_unlocked column (no longer needed)
ALTER TABLE movements DROP COLUMN IF EXISTS is_unlocked;

-- Add unique constraint to prevent duplicate exercises per category
ALTER TABLE movements 
  ADD CONSTRAINT movements_user_category_exercise_unique 
  UNIQUE (user_id, category, exercise_variation);

-- Backfill existing rows with default rotation values
UPDATE movements 
SET 
  rotation_order = 1,
  last_used_date = NULL
WHERE rotation_order IS NULL;

-- Create index for efficient rotation queries
CREATE INDEX IF NOT EXISTS idx_movements_rotation 
  ON movements(user_id, category, rotation_order);

-- Create index for last_used_date queries
CREATE INDEX IF NOT EXISTS idx_movements_last_used 
  ON movements(user_id, category, last_used_date NULLS FIRST);

-- Add DELETE policy for movements table (was missing)
CREATE POLICY "Users can delete own movements" ON movements 
  FOR DELETE 
  USING (auth.uid() = user_id);

