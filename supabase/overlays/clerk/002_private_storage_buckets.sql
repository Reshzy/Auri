-- Private Storage buckets for Clerk-backed Auri.
-- Access is trusted server code (service role) AFTER Clerk session + DAL ownership checks.
-- Do not add auth.uid() path policies. Do not make these buckets public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'templates',
    'templates',
    false,
    52428800,
    array[
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'
    ]
  ),
  (
    'generated-reports',
    'generated-reports',
    false,
    52428800,
    array[
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/octet-stream'
    ]
  )
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
set public = false
where id in ('templates', 'generated-reports');
