-- Migration: Add user-level primary_goal column to profiles
-- Captures a user's overarching ambition at onboarding (required on /welcome).
-- Sits above the per-social-profile social_goals table; later phases can seed
-- a social_goals row from this value when a profile is connected.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS primary_goal TEXT
  CHECK (primary_goal IN ('grow_audience', 'make_money', 'build_brand', 'drive_traffic'));

COMMENT ON COLUMN profiles.primary_goal IS
  'User-level default ambition set at onboarding. Maps to social_goals.primary_objective: grow_audience->grow_followers, make_money->monetize, build_brand->build_brand, drive_traffic->drive_traffic.';
