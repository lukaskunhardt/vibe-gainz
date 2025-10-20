-- readiness table (daily self-reported training readiness)
CREATE TABLE readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE readiness ENABLE ROW LEVEL SECURITY;

-- RLS Policies for readiness
CREATE POLICY "Users can view own readiness" ON readiness FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own readiness" ON readiness FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own readiness" ON readiness FOR UPDATE USING (auth.uid() = user_id);

