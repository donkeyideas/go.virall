-- ============================================================
-- 015: Profile Ownership Verification (Bio Challenge)
-- ============================================================
-- Adds ownership verification fields to social_profiles.
-- A profile can be "verified" by the platform (blue badge) AND
-- independently "ownership_verified" by the Go Virall bio challenge.
-- ============================================================

-- New columns on social_profiles
ALTER TABLE social_profiles
  ADD COLUMN IF NOT EXISTS ownership_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_code TEXT,
  ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ownership_verified_at TIMESTAMPTZ;

-- Cross-org uniqueness: only ONE org can have a verified handle per platform.
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_profiles_verified_handle
  ON social_profiles (platform, handle)
  WHERE ownership_verified = true;

-- Speed up cross-org lookups during profile addition
CREATE INDEX IF NOT EXISTS idx_social_profiles_platform_handle
  ON social_profiles (platform, handle);
