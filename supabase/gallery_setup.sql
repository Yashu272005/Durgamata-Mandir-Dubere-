-- =====================================================================
-- Durga Mata Mandir gallery/media setup
-- Run this after the admin login setup script.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.gallery_media (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'General',
  media_type text not null check (media_type in ('image', 'video')),
  storage_path text not null,
  thumbnail_path text,
  file_name text,
  file_size bigint,
  status text not null default 'published' check (status in ('published', 'unpublished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gallery_media_created_idx
  on public.gallery_media (created_at desc);
create index if not exists gallery_media_status_idx
  on public.gallery_media (status, created_at desc);
create index if not exists gallery_media_category_idx
  on public.gallery_media (category);

create or replace function public.touch_gallery_media_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger if not exists gallery_media_touch_updated_at
before update on public.gallery_media
for each row execute function public.touch_gallery_media_updated_at();

alter table public.gallery_media enable row level security;
revoke all on table public.gallery_media from public, anon, authenticated;
grant select on table public.gallery_media to anon, authenticated;
grant insert, update, delete on table public.gallery_media to authenticated;

-- Bucket name matches the browser client: GALLERY_BUCKET = 'gallery-media'
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery-media', 'gallery-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- The project's media_system.sql adds the final RLS policies and activity log.
-- This file creates the base table and bucket so the app has the structure it expects.
