-- 013: Seed data (feature flags + initial model version)

insert into feature_flags (key, enabled, description) values
  ('opportunities_curated_v1', true, 'Show curated brand opportunities'),
  ('opportunities_native_v1', false, 'Self-serve brand portal opportunities'),
  ('brand_portal_v1', false, 'Let brands create accounts'),
  ('agency_tier', false, 'Multi-seat agency accounts'),
  ('ml_scoring_v2', false, 'Next-gen scoring model'),
  ('newsletter_tool', false, 'Built-in newsletter feature')
on conflict (key) do nothing;

-- Initial model version for the rules-based v1 scoring engine
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
