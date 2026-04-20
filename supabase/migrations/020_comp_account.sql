-- Add comp_account column to profiles for complimentary/free access
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS comp_account boolean DEFAULT false;
