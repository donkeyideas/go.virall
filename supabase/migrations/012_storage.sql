-- 012: Storage buckets + policies

-- Avatars (public)
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy avatars_own on storage.objects for all
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Media (private, per-user)
insert into storage.buckets (id, name, public)
  values ('media', 'media', false)
  on conflict (id) do nothing;

create policy media_own on storage.objects for all
  using (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);

-- Invoices (private, signed URLs only)
insert into storage.buckets (id, name, public)
  values ('invoices', 'invoices', false)
  on conflict (id) do nothing;

create policy invoices_own on storage.objects for all
  using (bucket_id = 'invoices' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'invoices' and auth.uid()::text = (storage.foldername(name))[1]);

-- Media kits (public assets)
insert into storage.buckets (id, name, public)
  values ('media-kits', 'media-kits', true)
  on conflict (id) do nothing;

create policy media_kits_own_write on storage.objects for insert
  with check (bucket_id = 'media-kits' and auth.uid()::text = (storage.foldername(name))[1]);

create policy media_kits_own_update on storage.objects for update
  using (bucket_id = 'media-kits' and auth.uid()::text = (storage.foldername(name))[1]);
