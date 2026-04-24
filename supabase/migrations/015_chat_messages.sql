-- Chat messages persistence for Virall AI strategist
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('user', 'ai')),
  content text not null,
  created_at timestamptz not null default now()
);

create index on chat_messages (user_id, created_at desc);

-- RLS
alter table chat_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'chat_messages_owner_all' and tablename = 'chat_messages'
  ) then
    create policy chat_messages_owner_all on chat_messages
      for all using (user_id = auth_user_id()) with check (user_id = auth_user_id());
  end if;
end $$;
