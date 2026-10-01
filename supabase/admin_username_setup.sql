-- =====================================================================
-- Durga Mata Mandir Admin login setup
-- Run this in Supabase SQL editor after creating the admin auth user.
-- =====================================================================

create table if not exists public.admin_login_aliases (
  username text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_login_failures (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed_attempts integer not null default 0,
  locked_until timestamptz not null default now()
);

alter table public.admin_login_aliases enable row level security;
alter table public.admin_login_failures enable row level security;

revoke all on table public.admin_login_aliases from public, anon, authenticated;
revoke all on table public.admin_login_failures from public, anon, authenticated;
grant all on table public.admin_login_aliases to service_role;
grant all on table public.admin_login_failures to service_role;

create or replace function public.admin_login_is_limited(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.admin_login_failures f
    where f.user_id = p_user_id
      and f.failed_attempts >= 5
      and f.locked_until > now()
  );
end;
$$;

revoke all on function public.admin_login_is_limited(uuid) from public, anon, authenticated;
grant execute on function public.admin_login_is_limited(uuid) to service_role;

create or replace function public.admin_login_record_failure(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_count integer;
  current_attempts integer;
begin
  insert into public.admin_login_failures (user_id, failed_attempts, locked_until)
  values (p_user_id, 1, now() + interval '15 minutes')
  on conflict (user_id)
  do update set
    failed_attempts = public.admin_login_failures.failed_attempts + 1,
    locked_until = case
      when public.admin_login_failures.failed_attempts >= 4 then now() + interval '15 minutes'
      else public.admin_login_failures.locked_until
    end;

  select failed_attempts into current_attempts
  from public.admin_login_failures
  where user_id = p_user_id;

  if current_attempts >= 5 then
    update public.admin_login_failures
    set locked_until = now() + interval '15 minutes'
    where user_id = p_user_id;
  end if;
end;
$$;

revoke all on function public.admin_login_record_failure(uuid) from public, anon, authenticated;
grant execute on function public.admin_login_record_failure(uuid) to service_role;

create or replace function public.admin_login_clear_failures(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.admin_login_failures where user_id = p_user_id;
end;
$$;

revoke all on function public.admin_login_clear_failures(uuid) from public, anon, authenticated;
grant execute on function public.admin_login_clear_failures(uuid) to service_role;

-- Example setup for the one admin account:
--
-- update auth.users
--    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--  where email = 'YOU@EXAMPLE.COM';
--
-- insert into public.admin_login_aliases (username, user_id)
-- select 'choose-an-admin-id', id
-- from auth.users
-- where email = 'YOU@EXAMPLE.COM'
-- on conflict (username) do nothing;
--
-- The username regex in the app allows 3–32 chars using lowercase letters,
-- numbers, dots, underscores and dashes.
