-- 010: Row-Level Security policies

-- Helper functions
create or replace function auth_user_id() returns uuid
  language sql stable
as $$ select auth.uid() $$;

create or replace function is_admin() returns boolean
  language sql stable
as $$
  select exists (
    select 1 from users
    where id = auth.uid() and role = 'admin' and deleted_at is null
  );
$$;

-- ============ users ============
alter table users enable row level security;

create policy users_select_self on users
  for select using (id = auth_user_id());

create policy users_update_self on users
  for update using (id = auth_user_id())
  with check (
    id = auth_user_id()
    and role = (select role from users where id = auth_user_id())
    and subscription_tier = (select subscription_tier from users where id = auth_user_id())
  );

-- Public view for media kits / matches
create view users_public as
  select id, handle, display_name, avatar_url, bio
  from users
  where deleted_at is null;

grant select on users_public to anon, authenticated;

-- ============ platform_accounts ============
alter table platform_accounts enable row level security;

create policy platform_accounts_owner_all on platform_accounts
  for all using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- Safe view grants (tokens never reach client)
grant select on platform_accounts_safe to authenticated;
revoke select on platform_accounts from authenticated, anon;

-- ============ posts ============
alter table posts enable row level security;

create policy posts_owner_all on posts
  for all using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- ============ viral_scores ============
alter table viral_scores enable row level security;

create policy viral_scores_owner_read on viral_scores
  for select using (user_id = auth_user_id());

-- ============ smo_scores ============
alter table smo_scores enable row level security;

create policy smo_scores_owner_read on smo_scores
  for select using (user_id = auth_user_id());

-- ============ audience_snapshots ============
alter table audience_snapshots enable row level security;

create policy audience_snapshots_owner_read on audience_snapshots
  for select using (user_id = auth_user_id());

-- ============ aqs_scores ============
alter table aqs_scores enable row level security;

create policy aqs_scores_owner_read on aqs_scores
  for select using (user_id = auth_user_id());

-- ============ competitors ============
alter table competitors enable row level security;

create policy competitors_owner_all on competitors
  for all using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- ============ competitor_snapshots ============
alter table competitor_snapshots enable row level security;

create policy competitor_snapshots_read on competitor_snapshots
  for select using (
    exists (select 1 from competitors c where c.id = competitor_id and c.user_id = auth_user_id())
  );

-- ============ collab_matches ============
alter table collab_matches enable row level security;

create policy collab_matches_owner_read on collab_matches
  for select using (user_id = auth_user_id());

create policy collab_matches_owner_update on collab_matches
  for update using (user_id = auth_user_id())
  with check (user_id = auth_user_id());

-- ============ deals ============
alter table deals enable row level security;

create policy deals_owner_all on deals
  for all using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- ============ deal_events ============
alter table deal_events enable row level security;

create policy deal_events_read on deal_events
  for select using (
    exists (select 1 from deals d where d.id = deal_id and d.user_id = auth_user_id())
  );

create policy deal_events_insert on deal_events
  for insert with check (
    exists (select 1 from deals d where d.id = deal_id and d.user_id = auth_user_id())
    and created_by = auth_user_id()
  );

-- ============ invoices ============
alter table invoices enable row level security;

create policy invoices_owner_all on invoices
  for all using (user_id = auth_user_id()) with check (user_id = auth_user_id());

-- ============ brand_opportunities ============
alter table brand_opportunities enable row level security;

create policy opportunities_read_active on brand_opportunities
  for select using (active = true);

-- ============ opportunity_matches ============
alter table opportunity_matches enable row level security;

create policy opp_matches_owner_read on opportunity_matches
  for select using (user_id = auth_user_id());

create policy opp_matches_owner_update on opportunity_matches
  for update using (user_id = auth_user_id())
  with check (user_id = auth_user_id());

-- ============ media_kits ============
alter table media_kits enable row level security;

create policy media_kits_read on media_kits
  for select using (
    user_id = auth_user_id()
    or (public = true and user_id is not null)
  );

create policy media_kits_update_owner on media_kits
  for update using (user_id = auth_user_id()) with check (user_id = auth_user_id());

create policy media_kits_insert_owner on media_kits
  for insert with check (user_id = auth_user_id());

-- ============ subscriptions ============
alter table subscriptions enable row level security;

create policy subscriptions_read_own on subscriptions
  for select using (user_id = auth_user_id());

-- ============ stripe_events ============
alter table stripe_events enable row level security;
-- No client policies, service role only

-- ============ feature_flags ============
alter table feature_flags enable row level security;

create policy feature_flags_read on feature_flags
  for select using (true);

-- ============ notifications ============
alter table notifications enable row level security;

create policy notifications_owner_read on notifications
  for select using (user_id = auth_user_id());

create policy notifications_owner_update on notifications
  for update using (user_id = auth_user_id())
  with check (user_id = auth_user_id());

-- ============ user_events ============
alter table user_events enable row level security;

create policy user_events_insert_own on user_events
  for insert with check (user_id = auth_user_id() or user_id is null);

-- ============ audit_log ============
alter table audit_log enable row level security;
-- No client policies, admin uses service role

-- ============ model_versions ============
alter table model_versions enable row level security;
-- No client policies, admin uses service role
