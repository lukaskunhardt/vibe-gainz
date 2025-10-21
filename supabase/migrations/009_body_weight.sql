-- body_weight table (daily body weight tracking)
CREATE TABLE body_weight (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC(5, 2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE body_weight ENABLE ROW LEVEL SECURITY;

-- RLS Policies for body_weight
CREATE POLICY "Users can view own body weight" ON body_weight FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own body weight" ON body_weight FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own body weight" ON body_weight FOR UPDATE USING (auth.uid() = user_id);

