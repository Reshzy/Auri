-- Production Supabase overlay: bind profiles.id to auth.users.
-- Portable Drizzle migrations intentionally omit this FK (local Postgres has no auth schema).

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_auth_users_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_auth_users_fkey
      foreign key (id)
      references auth.users (id)
      on delete cascade;
  end if;
end $$;
