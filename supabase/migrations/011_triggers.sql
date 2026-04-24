-- 011: Triggers

-- updated_at auto-update trigger function
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- Apply to all tables with updated_at
create trigger trg_users_updated_at before update on users
  for each row execute function touch_updated_at();

create trigger trg_platform_accounts_updated_at before update on platform_accounts
  for each row execute function touch_updated_at();

create trigger trg_posts_updated_at before update on posts
  for each row execute function touch_updated_at();

create trigger trg_deals_updated_at before update on deals
  for each row execute function touch_updated_at();

create trigger trg_invoices_updated_at before update on invoices
  for each row execute function touch_updated_at();

create trigger trg_brand_opportunities_updated_at before update on brand_opportunities
  for each row execute function touch_updated_at();

create trigger trg_media_kits_updated_at before update on media_kits
  for each row execute function touch_updated_at();

create trigger trg_subscriptions_updated_at before update on subscriptions
  for each row execute function touch_updated_at();

create trigger trg_feature_flags_updated_at before update on feature_flags
  for each row execute function touch_updated_at();

-- auth.users -> public.users sync on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, display_name, handle)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'))
  );
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Deal stage change -> deal_events
create or replace function log_deal_stage_change()
returns trigger language plpgsql as $$
begin
  if old.stage is distinct from new.stage then
    insert into deal_events (deal_id, event_type, from_stage, to_stage, created_by)
    values (new.id, 'stage_changed', old.stage, new.stage, new.user_id);
  end if;
  return new;
end; $$;

create trigger trg_deal_stage after update on deals
  for each row execute function log_deal_stage_change();
