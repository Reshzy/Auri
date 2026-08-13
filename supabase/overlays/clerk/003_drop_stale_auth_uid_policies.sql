-- Drop stale Supabase Auth policies if overlays 003/004 were applied by mistake.
-- Safe to run when those policies are absent. Does not drop tables or buckets.
-- Does not rewrite Drizzle migration history.

drop policy if exists "Users can read their profile" on public.profiles;
drop policy if exists "Users can update their profile" on public.profiles;

drop policy if exists "Users can read their schedules" on public.work_schedules;
drop policy if exists "Users can create their schedules" on public.work_schedules;
drop policy if exists "Users can update their schedules" on public.work_schedules;
drop policy if exists "Users can delete their schedules" on public.work_schedules;

drop policy if exists "Users can read their signatories" on public.signatories;
drop policy if exists "Users can create their signatories" on public.signatories;
drop policy if exists "Users can update their signatories" on public.signatories;
drop policy if exists "Users can delete their signatories" on public.signatories;

drop policy if exists "Users can read their presets" on public.accomplishment_presets;
drop policy if exists "Users can create their presets" on public.accomplishment_presets;
drop policy if exists "Users can update their presets" on public.accomplishment_presets;
drop policy if exists "Users can delete their presets" on public.accomplishment_presets;

drop policy if exists "Users can read their reports" on public.report_periods;
drop policy if exists "Users can create their reports" on public.report_periods;
drop policy if exists "Users can update their editable reports" on public.report_periods;
drop policy if exists "Users can delete their draft reports" on public.report_periods;

drop policy if exists "Users can read their daily entries" on public.daily_entries;
drop policy if exists "Users can create their daily entries" on public.daily_entries;
drop policy if exists "Users can update their daily entries on editable reports" on public.daily_entries;
drop policy if exists "Users can delete their daily entries on draft reports" on public.daily_entries;

drop policy if exists "Authenticated users can read template versions" on public.template_versions;

drop policy if exists "Users can read their exports" on public.report_exports;
drop policy if exists "Users can create their exports" on public.report_exports;
drop policy if exists "Users can update their exports" on public.report_exports;
drop policy if exists "Users can delete their exports" on public.report_exports;

drop policy if exists "Users can read own generated reports" on storage.objects;
drop policy if exists "Users can upload own generated reports" on storage.objects;
drop policy if exists "Users can update own generated reports" on storage.objects;
drop policy if exists "Users can delete own generated reports" on storage.objects;
