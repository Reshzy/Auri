-- Optional hosted overlay: bind profiles.auth_user_id to auth.users.
-- Portable Drizzle keeps auth_user_id as text. Apply only on hosted Supabase
-- after drizzle/0004 and only when every auth_user_id value is a UUID
-- (Supabase Auth user ids). Do not apply locally.
--
-- This is NOT profiles.id = auth.users.id. Tenant FKs stay on profiles.id.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'auth_user_id'
      and data_type = 'text'
  ) then
    alter table public.profiles
      alter column auth_user_id type uuid using auth_user_id::uuid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_auth_user_id_auth_users_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_auth_user_id_auth_users_fkey
      foreign key (auth_user_id)
      references auth.users (id)
      on delete cascade;
  end if;
end $$;
