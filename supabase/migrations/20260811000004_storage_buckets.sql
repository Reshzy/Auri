-- Private storage buckets and policies (master spec §8.5)

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
on conflict (id) do nothing;

-- templates: no direct client read/write; server/admin uses service role.
-- Deny authenticated role explicitly by omitting policies (RLS default deny).

-- generated-reports: users may read only their own path prefix {userId}/...
create policy "Users can read own generated reports"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'generated-reports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Uploads happen from authenticated server code acting as the user.
create policy "Users can upload own generated reports"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'generated-reports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update own generated reports"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'generated-reports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'generated-reports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete own generated reports"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'generated-reports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
