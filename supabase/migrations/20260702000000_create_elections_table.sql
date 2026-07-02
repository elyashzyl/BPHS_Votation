create table if not exists public.elections (
  year text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamp with time zone not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'elections_data_is_object'
      and conrelid = 'public.elections'::regclass
  ) then
    alter table public.elections
      add constraint elections_data_is_object check (jsonb_typeof(data) = 'object');
  end if;
end $$;

create index if not exists elections_updated_at_idx on public.elections (updated_at desc);

alter table public.elections enable row level security;

drop policy if exists "Allow public reads for election data" on public.elections;
create policy "Allow public reads for election data"
  on public.elections
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow public inserts for election data" on public.elections;
create policy "Allow public inserts for election data"
  on public.elections
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow public updates for election data" on public.elections;
create policy "Allow public updates for election data"
  on public.elections
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Allow public deletes for election data" on public.elections;
create policy "Allow public deletes for election data"
  on public.elections
  for delete
  to anon, authenticated
  using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.elections to anon, authenticated;
