-- Auri Phase 2 core schema (master spec §8.1–8.2)

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- profiles (id = auth.users.id)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  employee_name text not null default '',
  employee_title text,
  organization_name text,
  office_name text,
  department_name text,
  timezone text not null default 'Asia/Manila',
  locale text not null default 'en-PH',
  active_schedule_id uuid,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- work_schedules
create table public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  weekday_rules jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index work_schedules_user_id_idx on public.work_schedules (user_id);

create unique index work_schedules_one_default_per_user_idx
  on public.work_schedules (user_id)
  where is_default = true;

create trigger work_schedules_set_updated_at
before update on public.work_schedules
for each row execute function public.set_updated_at();

alter table public.profiles
  add constraint profiles_active_schedule_id_fkey
  foreign key (active_schedule_id)
  references public.work_schedules (id)
  on delete set null;

-- signatories
create table public.signatories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  display_name text not null,
  title text not null,
  slot smallint not null,
  is_active boolean not null default true,
  effective_from date,
  effective_to date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint signatories_slot_range_check check (slot >= 0 and slot <= 3)
);

create index signatories_user_id_idx on public.signatories (user_id);

create unique index signatories_active_slot_per_user_idx
  on public.signatories (user_id, slot)
  where is_active = true;

create trigger signatories_set_updated_at
before update on public.signatories
for each row execute function public.set_updated_at();

-- accomplishment_presets
create table public.accomplishment_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  content text not null,
  category text,
  shortcut text,
  use_count integer not null default 0,
  last_used_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint accomplishment_presets_use_count_nonneg check (use_count >= 0)
);

create index accomplishment_presets_user_id_idx on public.accomplishment_presets (user_id);

create index accomplishment_presets_user_active_use_count_idx
  on public.accomplishment_presets (user_id, is_active, use_count desc);

create unique index accomplishment_presets_shortcut_per_user_idx
  on public.accomplishment_presets (user_id, shortcut)
  where shortcut is not null;

create trigger accomplishment_presets_set_updated_at
before update on public.accomplishment_presets
for each row execute function public.set_updated_at();

-- report_periods
create table public.report_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_kind text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft',
  schedule_snapshot jsonb not null,
  profile_snapshot jsonb not null,
  signatory_snapshot jsonb not null,
  finalized_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint report_periods_kind_check
    check (period_kind in ('FIRST_HALF', 'SECOND_HALF', 'CUSTOM')),
  constraint report_periods_status_check
    check (status in ('draft', 'ready', 'finalized', 'archived')),
  constraint report_periods_date_order_check check (start_date <= end_date)
);

create index report_periods_user_id_idx on public.report_periods (user_id);

create index report_periods_user_start_date_idx
  on public.report_periods (user_id, start_date desc);

create trigger report_periods_set_updated_at
before update on public.report_periods
for each row execute function public.set_updated_at();

-- daily_entries
create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  report_period_id uuid not null references public.report_periods (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_date date not null,
  classification text not null,
  classification_label text,
  am_arrival time,
  am_departure time,
  pm_arrival time,
  pm_departure time,
  worked_minutes integer not null default 0,
  calculated_undertime_minutes integer not null default 0,
  undertime_override_minutes integer,
  accomplishments text[] not null default '{}'::text[],
  remarks text,
  is_complete boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint daily_entries_classification_check
    check (
      classification in (
        'workday',
        'scheduled_off',
        'holiday',
        'leave',
        'absent',
        'custom'
      )
    ),
  constraint daily_entries_worked_minutes_nonneg check (worked_minutes >= 0),
  constraint daily_entries_calc_undertime_nonneg check (calculated_undertime_minutes >= 0),
  constraint daily_entries_override_undertime_nonneg
    check (undertime_override_minutes is null or undertime_override_minutes >= 0),
  constraint daily_entries_unique_date_per_report unique (report_period_id, work_date)
);

create index daily_entries_user_id_idx on public.daily_entries (user_id);
create index daily_entries_report_period_id_idx on public.daily_entries (report_period_id);

create trigger daily_entries_set_updated_at
before update on public.daily_entries
for each row execute function public.set_updated_at();

-- template_versions
create table public.template_versions (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  version integer not null,
  file_type text not null,
  storage_path text not null,
  sha256 text not null,
  manifest jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint template_versions_key_check
    check (template_key in ('accomplishment', 'dtr')),
  constraint template_versions_file_type_check
    check (file_type in ('docx', 'xlsx')),
  constraint template_versions_key_version_unique unique (template_key, version)
);

create unique index template_versions_one_active_per_key_idx
  on public.template_versions (template_key)
  where is_active = true;

create trigger template_versions_set_updated_at
before update on public.template_versions
for each row execute function public.set_updated_at();

-- report_exports
create table public.report_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  report_period_id uuid not null references public.report_periods (id) on delete cascade,
  template_version_id uuid not null references public.template_versions (id),
  format text not null,
  storage_path text not null,
  file_name text not null,
  file_size_bytes bigint not null,
  sha256 text not null,
  source_revision text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint report_exports_format_check check (format in ('docx', 'xlsx', 'zip')),
  constraint report_exports_file_size_nonneg check (file_size_bytes >= 0)
);

create index report_exports_user_id_idx on public.report_exports (user_id);

create index report_exports_period_created_idx
  on public.report_exports (report_period_id, created_at desc);
