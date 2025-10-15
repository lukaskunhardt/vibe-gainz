-- Remove onboarding_completed flag from profiles table
-- Users can now access the training guide anytime, so we don't need to track completion

ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_completed;

