-- movement_target_history table tracks daily target changes over time
CREATE TABLE movement_target_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_id UUID NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
  category movement_category NOT NULL,
  date DATE NOT NULL,
  target INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(movement_id, date)
);

ALTER TABLE movement_target_history ENABLE ROW LEVEL SECURITY;

-- Seed current targets so historical line has an initial value
INSERT INTO movement_target_history (user_id, movement_id, category, date, target)
SELECT user_id, id, category, CURRENT_DATE, daily_target
FROM movements;

-- RLS policies: users manage their own history
CREATE POLICY "Users can view own target history" ON movement_target_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own target history" ON movement_target_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own target history" ON movement_target_history
  FOR UPDATE USING (auth.uid() = user_id);

