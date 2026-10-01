-- =====================================================================
-- Durga Mata Mandir — media system upgrade (run AFTER the two existing
-- setup files: admin_username_setup.sql and gallery_setup.sql).
-- Safe to run more than once.
-- =====================================================================

-- ---------- 1. Single-admin hardening --------------------------------
-- Only ONE row may ever exist in admin_login_aliases (one admin account).
create unique index if not exists admin_login_aliases_single_admin
  on public.admin_login_aliases ((true));

-- Sessions issued before "sessions_valid_after" are rejected by is_admin(),
-- so changing credentials locks out old tokens immediately (not after 1 h).
create table if not exists public.admin_security (
  id boolean primary key default true check (id),
  sessions_valid_after timestamptz not null default 'epoch'
);
insert into public.admin_security (id) values (true) on conflict do nothing;
alter table public.admin_security enable row level security;
revoke all on table public.admin_security from public, anon, authenticated;
grant all on table public.admin_security to service_role;

-- The ONE function every policy relies on.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
     and exists (select 1 from public.admin_login_aliases a where a.user_id = auth.uid())
     and coalesce(
           to_timestamp((auth.jwt() ->> 'iat')::bigint) >=
             (select s.sessions_valid_after from public.admin_security s where s.id),
           false);
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------- 2. Media table: new columns -------------------------------
alter table public.gallery_media
  add column if not exists description text
    check (description is null or char_length(description) <= 1000),
  add column if not exists category text not null default 'General'
    check (char_length(btrim(category)) between 1 and 60),
  add column if not exists status text not null default 'published'
    check (status in ('published', 'unpublished')),
  add column if not exists file_name text,
  add column if not exists file_size bigint check (file_size is null or file_size >= 0),
  add column if not exists thumbnail_path text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists gallery_media_status_created_idx
  on public.gallery_media (status, created_at desc);
create index if not exists gallery_media_type_idx on public.gallery_media (media_type);
create index if not exists gallery_media_category_idx on public.gallery_media (category);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists gallery_media_touch on public.gallery_media;
create trigger gallery_media_touch before update on public.gallery_media
  for each row execute function public.touch_updated_at();

-- ---------- 3. Row-level security -------------------------------------
grant select on public.gallery_media to anon, authenticated;
grant insert, update, delete on public.gallery_media to authenticated;
alter table public.gallery_media enable row level security;

drop policy if exists "Gallery media is public to read" on public.gallery_media;
drop policy if exists "Admins can add gallery media" on public.gallery_media;
drop policy if exists "Admins can delete gallery media" on public.gallery_media;
drop policy if exists "Public reads published media" on public.gallery_media;
drop policy if exists "Admin reads all media" on public.gallery_media;
drop policy if exists "Admin inserts media" on public.gallery_media;
drop policy if exists "Admin updates media" on public.gallery_media;
drop policy if exists "Admin deletes media" on public.gallery_media;

drop policy if exists "Public reads published media" on public.gallery_media;
drop policy if exists "Admin reads all media" on public.gallery_media;
drop policy if exists "Admin inserts media" on public.gallery_media;
drop policy if exists "Admin updates media" on public.gallery_media;
drop policy if exists "Admin deletes media" on public.gallery_media;

create policy "Public reads published media" on public.gallery_media
  for select to anon, authenticated using (status = 'published');
create policy "Admin reads all media" on public.gallery_media
  for select to authenticated using (public.is_admin());
create policy "Admin inserts media" on public.gallery_media
  for insert to authenticated with check (public.is_admin());
create policy "Admin updates media" on public.gallery_media
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin deletes media" on public.gallery_media
  for delete to authenticated using (public.is_admin());

-- ---------- 4. Storage bucket + policies ------------------------------
-- 52428800 bytes = 50 MB, the per-file maximum on Supabase's free plan.
-- On a paid plan raise BOTH this value and MAX_VIDEO_MB in src/admin.js.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery-media', 'gallery-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Gallery files are public to read" on storage.objects;
drop policy if exists "Admins can upload gallery files" on storage.objects;
drop policy if exists "Admins can delete gallery files" on storage.objects;
drop policy if exists "Admin uploads gallery files" on storage.objects;
drop policy if exists "Admin deletes gallery files" on storage.objects;

create policy "Gallery files are public to read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'gallery-media');
create policy "Admin uploads gallery files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gallery-media' and public.is_admin()
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Admin deletes gallery files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'gallery-media' and public.is_admin());

-- ---------- 5. Activity log -------------------------------------------
create table if not exists public.admin_activity_log (
  id bigint generated always as identity primary key,
  action text not null,
  detail text,
  media_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists admin_activity_log_created_idx
  on public.admin_activity_log (created_at desc);

alter table public.admin_activity_log enable row level security;
revoke all on table public.admin_activity_log from public, anon, authenticated;
grant select on table public.admin_activity_log to authenticated;
grant all on table public.admin_activity_log to service_role;

drop policy if exists "Admin reads activity" on public.admin_activity_log;
create policy "Admin reads activity" on public.admin_activity_log
  for select to authenticated using (public.is_admin());

-- Media events are logged by the database itself, so they cannot be skipped
-- or forged from the browser.
create or replace function public.log_media_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.admin_activity_log (action, detail, media_id)
    values (case when new.media_type = 'video' then 'video_upload' else 'photo_upload' end,
            new.title, new.id);
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.admin_activity_log (action, detail, media_id)
      values (case when new.status = 'published' then 'publish' else 'unpublish' end,
              new.title, new.id);
    end if;
    if (new.title, new.description, new.category, new.storage_path)
       is distinct from (old.title, old.description, old.category, old.storage_path) then
      insert into public.admin_activity_log (action, detail, media_id)
      values ('media_edit', new.title, new.id);
    end if;
  elsif tg_op = 'DELETE' then
    insert into public.admin_activity_log (action, detail, media_id)
    values ('media_delete', old.title, old.id);
  end if;
  return null;
end; $$;

drop trigger if exists gallery_media_log on public.gallery_media;
create trigger gallery_media_log after insert or update or delete on public.gallery_media
  for each row execute function public.log_media_activity();

-- Logout is the only event the browser reports (login and credential
-- changes are written by the Edge Functions).
create or replace function public.log_admin_logout()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.is_admin() then
    insert into public.admin_activity_log (action) values ('logout');
  end if;
end; $$;
revoke all on function public.log_admin_logout() from public, anon;
grant execute on function public.log_admin_logout() to authenticated;
