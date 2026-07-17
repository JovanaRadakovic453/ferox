-- ============================================================
-- FEROX DATABASE SCHEMA — kompletan skript za SVEŽ Supabase projekat
-- ⚠️ NIKAD ne puštati na postojeću produkciju (tamo idu samo
--    pojedinačne migracije iz supabase/migrations/).
-- Stanje odgovara primenjenim migracijama zaključno sa 0013.
-- Kolone označene sa "legacy" postoje u bazi (istorijski podaci),
-- ali ih aplikacija više ne piše ni ne čita.
-- ============================================================

-- UUID default-i: stare tabele koriste uuid_generate_v4() (uuid-ossp),
-- novije gen_random_uuid() (built-in) — namerno ostavljeno kao u produkciji.
create extension if not exists "uuid-ossp";

-- ============================
-- PROFILES
-- ============================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  reason text not null default 'all' check (reason in ('work', 'school', 'personal', 'all')),
  rhythm text not null default 'mixed' check (rhythm in ('morning', 'midday', 'evening', 'mixed')), -- legacy (hronotip)
  morning_tasks text[] not null default '{}',   -- legacy (navike iz starog onboardinga)
  evening_tasks text[] not null default '{}',   -- legacy
  sleep_time text not null default '23:00',
  start_time text not null default '08:00',
  rest_days int[] not null default '{0,6}',
  completed_once boolean not null default false,
  last_sleep_time text,
  last_sleep_hours float,
  best_streak int not null default 0,
  locale text not null default 'sr' check (locale in ('sr', 'en')), -- jezik AI odgovora (i UI-ja, u sledećoj fazi)
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  micro_feedback boolean not null default true,
  sound_enabled boolean not null default false,
  pomodoro_minutes smallint not null default 25 check (pomodoro_minutes between 5 and 90),
  reminder_time text check (reminder_time is null or reminder_time ~ '^([01]\d|2[0-3]):[0-5]\d$'), -- legacy (podsetnik je sada fiksno jutarnji)
  push_subscription jsonb,
  google_access_token text,
  google_refresh_token text,
  google_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================
-- ZONES — oblasti života (Posao, Fakultet, Zdravlje...)
-- ============================
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  icon text not null default '📁',
  position int not null default 0,
  created_at timestamptz default now()
);

alter table public.zones enable row level security;

create policy "Users manage own zones" on public.zones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_zones_user on public.zones(user_id, position);

-- ============================
-- DAY ENTRIES — jedan red po (user, datum)
-- ============================
create table if not exists public.day_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles on delete cascade not null,
  date_key date not null,
  energy text not null default '',        -- legacy (energy-adaptive era)
  energy_level smallint check (energy_level is null or energy_level between 1 and 5), -- legacy
  sleep_hours float,
  water_intake int not null default 0,    -- legacy (water tracker uklonjen)
  water_goal int not null default 2000,   -- legacy
  reflection text,                        -- legacy (EOD refleksija uklonjena)
  eod_recap text,                         -- keš AI rezimea dana
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,  -- NULL = aktivan dan; != NULL = dan je završen
  unique(user_id, date_key)
);

alter table public.day_entries enable row level security;

create policy "Users can manage own day entries"
  on public.day_entries for all
  using (auth.uid() = user_id);

-- ============================
-- TASKS — zadaci vezani za day_entry
-- ============================
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid references public.day_entries on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  done boolean not null default false,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  type text not null default 'light' check (type in (
    'creative', 'analytical', 'meetings', 'communication',
    'admin', 'light', 'rest', 'learning', 'exercise',
    'planning', 'reading', 'meditation'
  )), -- tip se više ne bira u UI (default 'light'); koristi se u EOD/uvidima za stare podatke
  note text not null default '',
  position int not null default 0,
  block_index smallint check (block_index is null or block_index between 0 and 3), -- legacy (blokovi uklonjeni)
  zone_id uuid references public.zones(id) on delete set null, -- legacy (oblasti uklonjene iz app-a)
  deadline_date date default null, -- rok: do kada mora biti gotovo (prati zadatak i kad uđe u dan)
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Users can manage own tasks"
  on public.tasks for all
  using (auth.uid() = user_id);

-- ============================
-- APPOINTMENTS — termini po datumu
-- ============================
create table if not exists public.appointments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles on delete cascade not null,
  date_key date not null,
  name text not null,
  time text not null,
  reminder int not null default 15,
  done boolean not null default false,
  zone_id uuid references public.zones(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

create policy "Users can manage own appointments"
  on public.appointments for all
  using (auth.uid() = user_id);

-- ============================
-- TRANSFERRED TASKS — nedovršeno preneseno na sutra (jsonb)
-- ============================
create table if not exists public.transferred_tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles on delete cascade not null,
  tasks jsonb not null default '[]',
  for_date date not null,
  created_at timestamptz not null default now(),
  unique(user_id, for_date)
);

alter table public.transferred_tasks enable row level security;

create policy "Users can manage own transferred tasks"
  on public.transferred_tasks for all
  using (auth.uid() = user_id);

-- ============================
-- SCHEDULED TASKS — kalendarski zadaci unapred (rok + podsetnik)
-- ============================
create table if not exists public.scheduled_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  type text not null default 'light', -- UI ga ne nudi; ostaje default
  note text not null default '',
  for_date date not null,
  done boolean not null default false,
  remind_before_minutes integer default null, -- podsetnik N minuta pre (app ograničava na 28 dana)
  deadline_date date default null,
  zone_id uuid references public.zones(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.scheduled_tasks enable row level security;

create policy "Users manage own scheduled tasks" on public.scheduled_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_scheduled_tasks_user_date on public.scheduled_tasks(user_id, for_date);

-- ============================
-- ROUTINES — šabloni zadataka (jsonb lista)
-- ============================
create table if not exists public.routines (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  tasks jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.routines enable row level security;

create policy "Users manage own routines"
  on public.routines for all using (auth.uid() = user_id);

-- ============================
-- INDEXES
-- ============================
create index if not exists idx_day_entries_user_date on public.day_entries(user_id, date_key desc);
create index if not exists idx_tasks_entry on public.tasks(entry_id);
create index if not exists idx_tasks_user on public.tasks(user_id);
create index if not exists idx_tasks_user_deadline on public.tasks(user_id, deadline_date);
create index if not exists idx_appointments_user_date on public.appointments(user_id, date_key);
create index if not exists idx_transferred_user_date on public.transferred_tasks(user_id, for_date);

-- ============================
-- RATE LIMITS (per-user, fixed window) — vidi migrations/0003_rate_limit.sql
-- ============================
create table if not exists public.rate_limits (
  user_id uuid not null references auth.users on delete cascade,
  route text not null,
  window_start timestamptz not null default now(),
  count int not null default 0,
  primary key (user_id, route)
);

alter table public.rate_limits enable row level security;
-- Bez policy-ja: jedini pristup je preko rate_limit_hit (SECURITY DEFINER).

create or replace function public.rate_limit_hit(
  p_route text,
  p_limit int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_count int;
begin
  if v_user is null then
    return false;
  end if;

  insert into public.rate_limits as rl (user_id, route, window_start, count)
  values (v_user, p_route, v_now, 1)
  on conflict (user_id, route) do update
    set count = case
          when rl.window_start < v_now - make_interval(secs => p_window_seconds) then 1
          else rl.count + 1
        end,
        window_start = case
          when rl.window_start < v_now - make_interval(secs => p_window_seconds) then v_now
          else rl.window_start
        end
  returning rl.count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.rate_limit_hit(text, int, int) from public;
grant execute on function public.rate_limit_hit(text, int, int) to authenticated;
