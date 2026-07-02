create schema if not exists private;

create table if not exists public.election_years (
  year text primary key,
  title text not null default 'SBO Election',
  sbo_active boolean not null default true,
  classroom_active boolean not null default true,
  club_active boolean not null default true,
  grades text[] not null default array['7','8','9','10'],
  sections_by_grade jsonb not null default '{}'::jsonb,
  clubs text[] not null default array[]::text[],
  legacy_admin_password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.positions (
  id text primary key,
  year text not null references public.election_years(year) on delete cascade,
  name text not null,
  election_type text not null check (election_type in ('sbo', 'classroom', 'club')),
  display_order integer not null default 1 check (display_order > 0),
  max_vote integer not null default 1 check (max_vote > 0),
  filter_by_grade boolean not null default false,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidates (
  id text primary key,
  year text not null references public.election_years(year) on delete cascade,
  position_id text not null references public.positions(id) on delete restrict,
  name text not null,
  grade text,
  section text,
  party text,
  club text,
  image text,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voters (
  id text primary key,
  year text not null references public.election_years(year) on delete cascade,
  name text not null,
  name_key text not null,
  grade text not null,
  section text,
  club text,
  device_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ballots (
  id text primary key,
  year text not null references public.election_years(year) on delete cascade,
  voter_id text not null references public.voters(id) on delete cascade,
  election_type text not null check (election_type in ('sbo', 'classroom', 'club')),
  device_id text not null,
  cast_at timestamptz not null default now(),
  unique (year, election_type, device_id),
  unique (year, election_type, voter_id)
);

create table if not exists public.ballot_votes (
  id text primary key,
  year text not null references public.election_years(year) on delete cascade,
  ballot_id text not null references public.ballots(id) on delete cascade,
  voter_id text not null references public.voters(id) on delete cascade,
  position_id text not null references public.positions(id) on delete restrict,
  candidate_id text not null references public.candidates(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (ballot_id, candidate_id)
);

create table if not exists public.reports (
  id text primary key,
  year text not null references public.election_years(year) on delete cascade,
  name text,
  message text not null,
  election_type text check (election_type in ('sbo', 'classroom', 'club')),
  device_id text,
  resolved boolean not null default false,
  reply text,
  reply_timestamp timestamptz,
  follow_ups jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists positions_year_type_idx on public.positions (year, election_type, archived, display_order);
create index if not exists candidates_position_idx on public.candidates (position_id, archived);
create unique index if not exists voters_unique_identity_idx
  on public.voters (year, name_key, grade, coalesce(section, ''), coalesce(club, ''));
create index if not exists voters_year_type_idx on public.ballots (year, election_type, cast_at desc);
create index if not exists ballot_votes_year_position_idx on public.ballot_votes (year, position_id, candidate_id);
create index if not exists reports_year_created_idx on public.reports (year, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists election_years_touch_updated_at on public.election_years;
create trigger election_years_touch_updated_at
before update on public.election_years
for each row execute function public.touch_updated_at();

drop trigger if exists positions_touch_updated_at on public.positions;
create trigger positions_touch_updated_at
before update on public.positions
for each row execute function public.touch_updated_at();

drop trigger if exists candidates_touch_updated_at on public.candidates;
create trigger candidates_touch_updated_at
before update on public.candidates
for each row execute function public.touch_updated_at();

drop trigger if exists reports_touch_updated_at on public.reports;
create trigger reports_touch_updated_at
before update on public.reports
for each row execute function public.touch_updated_at();

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

create or replace function public.cast_ballot(
  p_year text,
  p_election_type text,
  p_device_id text,
  p_voter jsonb,
  p_votes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  election public.election_years;
  voter_id text := coalesce(p_voter->>'id', 'v_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 6));
  new_ballot_id text := 'bal_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 6);
  voter_name text := trim(coalesce(p_voter->>'name', ''));
  voter_grade text := coalesce(p_voter->>'grade', '');
  voter_section text := coalesce(p_voter->>'section', '');
  voter_club text := coalesce(p_voter->>'club', '');
  voter_name_key text := lower(regexp_replace(voter_name, '\s+', ' ', 'g'));
  vote_item jsonb;
  pos public.positions;
  candidate public.candidates;
  count_for_position integer;
begin
  if p_election_type not in ('sbo', 'classroom', 'club') then
    raise exception 'Invalid election type';
  end if;

  select * into election from public.election_years where year = p_year;
  if not found then
    raise exception 'Election year not found';
  end if;

  if (p_election_type = 'sbo' and not election.sbo_active)
    or (p_election_type = 'classroom' and not election.classroom_active)
    or (p_election_type = 'club' and not election.club_active) then
    raise exception 'Election is closed';
  end if;

  if voter_name = '' or voter_grade = '' or p_device_id = '' then
    raise exception 'Missing voter details';
  end if;

  if exists (
    select 1 from public.ballots
    where year = p_year and election_type = p_election_type and device_id = p_device_id
  ) then
    raise exception 'This device already voted in this election';
  end if;

  insert into public.voters (id, year, name, name_key, grade, section, club, device_id)
  values (voter_id, p_year, voter_name, voter_name_key, voter_grade, voter_section, voter_club, p_device_id);

  insert into public.ballots (id, year, voter_id, election_type, device_id)
  values (new_ballot_id, p_year, voter_id, p_election_type, p_device_id);

  for vote_item in select * from jsonb_array_elements(coalesce(p_votes, '[]'::jsonb))
  loop
    select * into pos
    from public.positions
    where id = vote_item->>'positionId'
      and year = p_year
      and election_type = p_election_type
      and archived = false;
    if not found then
      raise exception 'Invalid position';
    end if;

    select * into candidate
    from public.candidates
    where id = vote_item->>'candidateId'
      and year = p_year
      and position_id = pos.id
      and archived = false;
    if not found then
      raise exception 'Invalid candidate';
    end if;

    if p_election_type = 'classroom' and candidate.section is not null and candidate.section <> '' and candidate.section <> voter_section then
      raise exception 'Candidate is not available for this section';
    end if;

    if p_election_type = 'club' and candidate.club is not null and candidate.club <> '' and candidate.club <> voter_club then
      raise exception 'Candidate is not available for this club';
    end if;

    if pos.filter_by_grade and candidate.grade is not null and candidate.grade <> '' and candidate.grade <> voter_grade then
      raise exception 'Candidate is not available for this grade';
    end if;

    select count(*) into count_for_position
    from public.ballot_votes
    where ballot_id = new_ballot_id
      and position_id = pos.id;

    if count_for_position >= pos.max_vote then
      raise exception 'Too many votes for %', pos.name;
    end if;

    insert into public.ballot_votes (id, year, ballot_id, voter_id, position_id, candidate_id)
    values (
      coalesce(vote_item->>'id', 'vt_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 6)),
      p_year,
      new_ballot_id,
      voter_id,
      pos.id,
      candidate.id
    );
  end loop;

  return jsonb_build_object('ok', true, 'voterId', voter_id, 'ballotId', new_ballot_id);
end;
$$;

revoke all on function public.cast_ballot(text, text, text, jsonb, jsonb) from public;
grant execute on function public.cast_ballot(text, text, text, jsonb, jsonb) to anon, authenticated;

alter table public.election_years enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.positions enable row level security;
alter table public.candidates enable row level security;
alter table public.voters enable row level security;
alter table public.ballots enable row level security;
alter table public.ballot_votes enable row level security;
alter table public.reports enable row level security;

grant usage on schema public to anon, authenticated;
grant usage on schema private to anon, authenticated;
grant select on public.election_years, public.positions, public.candidates to anon;
grant insert on public.reports to anon;
grant select, insert, update, delete on public.election_years, public.positions, public.candidates, public.voters, public.ballots, public.ballot_votes, public.reports to authenticated;
grant select, insert, update, delete on public.admin_profiles to authenticated;

drop policy if exists "Public can read election years" on public.election_years;
create policy "Public can read election years"
on public.election_years for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage election years" on public.election_years;
create policy "Admins manage election years"
on public.election_years for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Public can read active positions" on public.positions;
create policy "Public can read active positions"
on public.positions for select
to anon, authenticated
using (archived = false or private.is_admin());

drop policy if exists "Admins manage positions" on public.positions;
create policy "Admins manage positions"
on public.positions for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Public can read active candidates" on public.candidates;
create policy "Public can read active candidates"
on public.candidates for select
to anon, authenticated
using (archived = false or private.is_admin());

drop policy if exists "Admins manage candidates" on public.candidates;
create policy "Admins manage candidates"
on public.candidates for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins read voters" on public.voters;
create policy "Admins read voters"
on public.voters for select
to authenticated
using (private.is_admin());

drop policy if exists "Admins manage voters" on public.voters;
create policy "Admins manage voters"
on public.voters for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins read ballots" on public.ballots;
create policy "Admins read ballots"
on public.ballots for select
to authenticated
using (private.is_admin());

drop policy if exists "Admins manage ballots" on public.ballots;
create policy "Admins manage ballots"
on public.ballots for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins read ballot votes" on public.ballot_votes;
create policy "Admins read ballot votes"
on public.ballot_votes for select
to authenticated
using (private.is_admin());

drop policy if exists "Admins manage ballot votes" on public.ballot_votes;
create policy "Admins manage ballot votes"
on public.ballot_votes for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Anyone can create reports" on public.reports;
create policy "Anyone can create reports"
on public.reports for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins manage reports" on public.reports;
create policy "Admins manage reports"
on public.reports for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins read admin profiles" on public.admin_profiles;
create policy "Admins read admin profiles"
on public.admin_profiles for select
to authenticated
using (private.is_admin());

drop policy if exists "Admins manage admin profiles" on public.admin_profiles;
create policy "Admins manage admin profiles"
on public.admin_profiles for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'elections') then
    revoke insert, update, delete on public.elections from anon, authenticated;
  end if;
end $$;
