-- Friends & Timeline feature

-- Friendships table to support mutual friendships with requests
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friend CHECK (user_id <> friend_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage rows where they are participant
CREATE POLICY "View own friendships or where participant" ON friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Create friendship requests as user" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update friendship if participant" ON friendships
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Delete friendship if participant" ON friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Optional: Relax profile visibility to allow searching by email (id + email)
-- If you prefer stricter privacy, replace with a view exposing limited fields.
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view profiles" ON profiles FOR SELECT USING (true);

-- Allow seeing friends' sets in feed
DROP POLICY IF EXISTS "Users can view own sets" ON sets;
CREATE POLICY "Users and friends can view sets" ON sets
  FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id = sets.user_id) OR
          (f.friend_id = auth.uid() AND f.user_id = sets.user_id)
        )
    )
  );

-- Helper function to accept friendship by id with safety check
CREATE OR REPLACE FUNCTION accept_friendship(p_friendship_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE friendships
    SET status = 'accepted', updated_at = NOW()
    WHERE id = p_friendship_id AND friend_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

