-- Clerk-safe defense in depth for Supabase Postgres.
-- Enable RLS on every user-owned table and template_versions.
-- Do not create auth.uid() policies: Clerk session IDs are not auth.users UUIDs.
-- With RLS enabled and no policies, anon/authenticated Data API access is denied.
-- The Auri server uses a privileged Postgres connection and MUST scope by
-- profiles.id after a verified Clerk session (explicit DAL authorization).
-- service_role / postgres bypass RLS and are trusted server/setup access only.

alter table public.profiles enable row level security;
alter table public.work_schedules enable row level security;
alter table public.signatories enable row level security;
alter table public.accomplishment_presets enable row level security;
alter table public.report_periods enable row level security;
alter table public.daily_entries enable row level security;
alter table public.template_versions enable row level security;
alter table public.report_exports enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.work_schedules from anon, authenticated;
revoke all on table public.signatories from anon, authenticated;
revoke all on table public.accomplishment_presets from anon, authenticated;
revoke all on table public.report_periods from anon, authenticated;
revoke all on table public.daily_entries from anon, authenticated;
revoke all on table public.template_versions from anon, authenticated;
revoke all on table public.report_exports from anon, authenticated;
