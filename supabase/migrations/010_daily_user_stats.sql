-- Consolidated daily user stats table
CREATE TABLE daily_user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Daily exercise selections (nullable - set when first accessing each category)
  push_exercise_id TEXT,
  pull_exercise_id TEXT,
  legs_exercise_id TEXT,
  
  -- Existing daily metrics
  readiness_score INTEGER CHECK (readiness_score >= 1 AND readiness_score <= 5),
  body_weight_kg NUMERIC(5, 2) CHECK (body_weight_kg > 0 AND body_weight_kg < 500),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE daily_user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own daily stats" ON daily_user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily stats" ON daily_user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily stats" ON daily_user_stats FOR UPDATE USING (auth.uid() = user_id);

-- Migrate existing data from readiness table
INSERT INTO daily_user_stats (user_id, date, readiness_score)
SELECT user_id, date, score FROM readiness
ON CONFLICT (user_id, date) DO UPDATE SET readiness_score = EXCLUDED.readiness_score;

-- Migrate existing data from body_weight table
INSERT INTO daily_user_stats (user_id, date, body_weight_kg)
SELECT user_id, date, weight_kg FROM body_weight
ON CONFLICT (user_id, date) DO UPDATE SET body_weight_kg = EXCLUDED.body_weight_kg;

-- Drop old tables after successful migration
DROP TABLE IF EXISTS readiness;
DROP TABLE IF EXISTS body_weight;

