-- Row Level Security (master spec §8.4)

alter table public.profiles enable row level security;
alter table public.work_schedules enable row level security;
alter table public.signatories enable row level security;
alter table public.accomplishment_presets enable row level security;
alter table public.report_periods enable row level security;
alter table public.daily_entries enable row level security;
alter table public.template_versions enable row level security;
alter table public.report_exports enable row level security;

-- profiles
create policy "Users can read their profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Inserts come from the security-definer auth trigger only.
-- No authenticated insert/delete policies on profiles.

-- work_schedules
create policy "Users can read their schedules"
  on public.work_schedules
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their schedules"
  on public.work_schedules
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their schedules"
  on public.work_schedules
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their schedules"
  on public.work_schedules
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- signatories
create policy "Users can read their signatories"
  on public.signatories
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their signatories"
  on public.signatories
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their signatories"
  on public.signatories
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their signatories"
  on public.signatories
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- accomplishment_presets
create policy "Users can read their presets"
  on public.accomplishment_presets
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their presets"
  on public.accomplishment_presets
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their presets"
  on public.accomplishment_presets
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their presets"
  on public.accomplishment_presets
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- report_periods
create policy "Users can read their reports"
  on public.report_periods
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their reports"
  on public.report_periods
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their editable reports"
  on public.report_periods
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status in ('draft', 'ready')
  )
  with check (
    (select auth.uid()) = user_id
    and status in ('draft', 'ready', 'finalized', 'archived')
  );

create policy "Users can delete their draft reports"
  on public.report_periods
  for delete
  to authenticated
  using ((select auth.uid()) = user_id and status = 'draft');

-- daily_entries
create policy "Users can read their daily entries"
  on public.daily_entries
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their daily entries"
  on public.daily_entries
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their daily entries on editable reports"
  on public.daily_entries
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.report_periods rp
      where rp.id = report_period_id
        and rp.user_id = (select auth.uid())
        and rp.status in ('draft', 'ready')
    )
  )
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their daily entries on draft reports"
  on public.daily_entries
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.report_periods rp
      where rp.id = report_period_id
        and rp.user_id = (select auth.uid())
        and rp.status = 'draft'
    )
  );

-- template_versions: authenticated read only; writes via service role / admin
create policy "Authenticated users can read template versions"
  on public.template_versions
  for select
  to authenticated
  using (true);

-- report_exports
create policy "Users can read their exports"
  on public.report_exports
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their exports"
  on public.report_exports
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their exports"
  on public.report_exports
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their exports"
  on public.report_exports
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
