-- Candidate photo storage setup.
-- Run after 20260702010000_normalize_election_schema.sql.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'candidate-photos',
  'candidate-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

drop policy if exists "Anyone can read candidate photos" on storage.objects;
create policy "Anyone can read candidate photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'candidate-photos');

drop policy if exists "Admins can upload candidate photos" on storage.objects;
create policy "Admins can upload candidate photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'candidate-photos'
  and (storage.foldername(name))[1] = 'candidates'
  and private.is_admin()
);

drop policy if exists "Admins can update candidate photos" on storage.objects;
create policy "Admins can update candidate photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'candidate-photos'
  and (storage.foldername(name))[1] = 'candidates'
  and private.is_admin()
)
with check (
  bucket_id = 'candidate-photos'
  and (storage.foldername(name))[1] = 'candidates'
  and private.is_admin()
);

drop policy if exists "Admins can delete candidate photos" on storage.objects;
create policy "Admins can delete candidate photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'candidate-photos'
  and (storage.foldername(name))[1] = 'candidates'
  and private.is_admin()
);
