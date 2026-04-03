-- ============================================================
-- Go Virall v4 — Auto-Provision OAuth Users
-- Paste this in Supabase Dashboard > SQL Editor > New Query
-- ============================================================
-- This trigger fires when a new auth user is created (via any method).
-- If no profile exists yet, it creates an organization + profile.
-- This handles Google/Apple OAuth on both web and mobile.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _full_name TEXT;
  _slug TEXT;
  _org_id UUID;
BEGIN
  -- Skip if profile already exists (e.g. created by server action)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  _full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  _slug := left(
    regexp_replace(lower(_full_name), '[^a-z0-9]', '-', 'g'),
    30
  ) || '-' || to_hex(extract(epoch FROM now())::int);

  -- Create organization with 14-day trial
  INSERT INTO public.organizations (name, slug, plan, max_social_profiles, subscription_status, trial_ends_at)
  VALUES (
    _full_name || '''s Dashboard',
    _slug,
    'free',
    1,
    'trialing',
    now() + interval '14 days'
  )
  RETURNING id INTO _org_id;

  -- Create profile
  INSERT INTO public.profiles (id, organization_id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    _org_id,
    _full_name,
    NEW.raw_user_meta_data ->> 'avatar_url',
    'owner'
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
