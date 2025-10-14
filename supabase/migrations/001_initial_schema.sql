-- Create custom types
CREATE TYPE movement_category AS ENUM ('push', 'pull', 'legs');

-- profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- movements table (tracks user's unlocked movements and targets)
CREATE TABLE movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category movement_category NOT NULL,
  exercise_variation TEXT NOT NULL,
  max_effort_reps INTEGER NOT NULL,
  max_effort_date TIMESTAMPTZ NOT NULL,
  daily_target INTEGER NOT NULL,
  is_unlocked BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- sets table (logs all workout sets)
CREATE TABLE sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_id UUID REFERENCES movements(id) ON DELETE SET NULL,
  category movement_category NOT NULL,
  exercise_variation TEXT NOT NULL,
  reps INTEGER NOT NULL,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  is_max_effort BOOLEAN DEFAULT FALSE,
  set_number INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sets_user_logged_at ON sets(user_id, logged_at DESC);
CREATE INDEX idx_sets_user_category_logged_at ON sets(user_id, category, logged_at DESC);

-- weekly_reviews table (tracks recovery scores and target adjustments)
CREATE TABLE weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_id UUID NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
  category movement_category NOT NULL,
  week_start_date DATE NOT NULL,
  recovery_score INTEGER CHECK (recovery_score >= 0 AND recovery_score <= 100),
  first_set_performance_score INTEGER CHECK (first_set_performance_score >= 0 AND first_set_performance_score <= 40),
  rpe_efficiency_score INTEGER CHECK (rpe_efficiency_score >= 0 AND rpe_efficiency_score <= 30),
  target_achievement_score INTEGER CHECK (target_achievement_score >= 0 AND target_achievement_score <= 20),
  consistency_score INTEGER CHECK (consistency_score >= 0 AND consistency_score <= 10),
  previous_daily_target INTEGER NOT NULL,
  suggested_daily_target INTEGER NOT NULL,
  chosen_daily_target INTEGER NOT NULL,
  user_overrode_suggestion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, week_start_date)
);

-- max_effort_prompts table (tracks benchmark test eligibility)
CREATE TABLE max_effort_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_id UUID NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
  category movement_category NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL,
  dismissed BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_effort_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for movements
CREATE POLICY "Users can view own movements" ON movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own movements" ON movements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own movements" ON movements FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for sets
CREATE POLICY "Users can view own sets" ON sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sets" ON sets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for weekly_reviews
CREATE POLICY "Users can view own reviews" ON weekly_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON weekly_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for max_effort_prompts
CREATE POLICY "Users can view own prompts" ON max_effort_prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prompts" ON max_effort_prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prompts" ON max_effort_prompts FOR UPDATE USING (auth.uid() = user_id);

