-- Add UPDATE and DELETE policies for sets table
CREATE POLICY "Users can update own sets" ON sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sets" ON sets FOR DELETE USING (auth.uid() = user_id);

