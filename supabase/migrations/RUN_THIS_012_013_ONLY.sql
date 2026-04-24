-- ============================================================
-- Run ONLY this file. Sections 001-011 already succeeded.
-- This finishes the remaining storage + seed setup.
-- ============================================================

-- ============ 012: Storage ============

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists avatars_own on storage.objects;
create policy avatars_own on storage.objects for all
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

insert into storage.buckets (id, name, public)
  values ('media', 'media', false)
  on conflict (id) do nothing;

drop policy if exists media_own on storage.objects;
create policy media_own on storage.objects for all
  using (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);

insert into storage.buckets (id, name, public)
  values ('invoices', 'invoices', false)
  on conflict (id) do nothing;

drop policy if exists invoices_own on storage.objects;
create policy invoices_own on storage.objects for all
  using (bucket_id = 'invoices' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'invoices' and auth.uid()::text = (storage.foldername(name))[1]);

insert into storage.buckets (id, name, public)
  values ('media-kits', 'media-kits', true)
  on conflict (id) do nothing;

drop policy if exists media_kits_own_write on storage.objects;
create policy media_kits_own_write on storage.objects for insert
  with check (bucket_id = 'media-kits' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists media_kits_own_update on storage.objects;
create policy media_kits_own_update on storage.objects for update
  using (bucket_id = 'media-kits' and auth.uid()::text = (storage.foldername(name))[1]);


-- ============ 013: Seed ============

insert into feature_flags (key, enabled, description) values
  ('opportunities_curated_v1', true, 'Show curated brand opportunities'),
  ('opportunities_native_v1', false, 'Self-serve brand portal opportunities'),
  ('brand_portal_v1', false, 'Let brands create accounts'),
  ('agency_tier', false, 'Multi-seat agency accounts'),
  ('ml_scoring_v2', false, 'Next-gen scoring model'),
  ('newsletter_tool', false, 'Built-in newsletter feature')
on conflict (key) do nothing;

insert into model_versions (name, version, registry_url, hash, metrics, deployed_at) values
  ('viral_score', 'v1.0.0', 'local://rules-engine', 'rules-v1', '{"type":"rules-based","factors":6,"signals":42}', now())
on conflict (name, version) do nothing;

-- Public media kit data function
create or replace function get_media_kit_data(kit_slug text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'kit', row_to_json(mk.*),
    'user', jsonb_build_object(
      'handle', u.handle,
      'display_name', u.display_name,
      'avatar_url', u.avatar_url,
      'bio', u.bio
    ),
    'platforms', (select coalesce(jsonb_agg(row_to_json(p.*)), '[]'::jsonb) from platform_accounts_safe p where p.user_id = u.id),
    'stats', (
      select jsonb_build_object(
        'total_followers', coalesce(sum(p.follower_count), 0),
        'platform_count', count(*)
      )
      from platform_accounts_safe p where p.user_id = u.id
    )
  )
  from media_kits mk
  join users u on u.id = mk.user_id
  where mk.slug = kit_slug and mk.public = true;
$$;

grant execute on function get_media_kit_data(text) to anon, authenticated;
