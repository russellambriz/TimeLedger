-- Hourwell cloud sync.
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- Safe to run more than once.

create table if not exists public.records (
  user_id     uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text   not null check (kind in ('session', 'category', 'settings', 'drink')),
  id          text   not null check (char_length(id) between 1 and 100),
  data        jsonb  check (data is null or pg_column_size(data) < 4000),
  deleted     boolean not null default false,
  modified_at bigint not null,                      -- device time of the change (ms); newest wins
  updated_at  timestamptz not null default clock_timestamp(),  -- server time; used to fetch changes
  primary key (user_id, kind, id)
);

create index if not exists records_user_updated on public.records (user_id, updated_at);

-- Keep the newest change: an upload that is not newer than what is stored is ignored.
create or replace function public.records_keep_newest()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.modified_at <= old.modified_at then
    return null;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists records_keep_newest on public.records;
create trigger records_keep_newest
  before insert or update on public.records
  for each row execute function public.records_keep_newest();

-- Each account can only see and change its own records.
alter table public.records enable row level security;

drop policy if exists "own records: read" on public.records;
create policy "own records: read" on public.records
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "own records: add" on public.records;
create policy "own records: add" on public.records
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "own records: change" on public.records;
create policy "own records: change" on public.records
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.records to authenticated;
revoke all on public.records from anon;

-- Live updates, so a timer started on one device appears on the others right away.
do $$
begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null;
end;
$$;

-- Upgrade for projects created before caffeine tracking (safe to re-run).
alter table public.records drop constraint if exists records_kind_check;
alter table public.records add constraint records_kind_check
  check (kind in ('session', 'category', 'settings', 'drink'));
