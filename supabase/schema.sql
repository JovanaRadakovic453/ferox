-- ============================
-- FEROX DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================
-- PROFILES
-- ============================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  reason text not null default 'all' check (reason in ('work', 'school', 'personal', 'all')),
  rhythm text not null default 'mixed' check (rhythm in ('morning', 'midday', 'evening', 'mixed')),
  morning_tasks text[] not null default '{}',
  evening_tasks text[] not null default '{}',
  sleep_time text not null default '23:00',
  start_time text not null default '08:00',
  rest_days int[] not null default '{0,6}',
  completed_once boolean not null default false,
  last_sleep_time text,
  last_sleep_hours float,
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
-- DAY ENTRIES
-- ============================
create table if not exists public.day_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles on delete cascade not null,
  date_key date not null,
  energy text not null default '',
  sleep_hours float,
  water_intake int not null default 0,
  water_goal int not null default 2000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date_key)
);

alter table public.day_entries enable row level security;

create policy "Users can manage own day entries"
  on public.day_entries for all
  using (auth.uid() = user_id);

-- ============================
-- TASKS
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
  )),
  note text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Users can manage own tasks"
  on public.tasks for all
  using (auth.uid() = user_id);

-- ============================
-- APPOINTMENTS
-- ============================
create table if not exists public.appointments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles on delete cascade not null,
  date_key date not null,
  name text not null,
  time text not null,
  reminder int not null default 15,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

create policy "Users can manage own appointments"
  on public.appointments for all
  using (auth.uid() = user_id);

-- ============================
-- TRANSFERRED TASKS
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
-- INDEXES for performance
-- ============================
create index if not exists idx_day_entries_user_date on public.day_entries(user_id, date_key desc);
create index if not exists idx_tasks_entry on public.tasks(entry_id);
create index if not exists idx_tasks_user on public.tasks(user_id);
create index if not exists idx_appointments_user_date on public.appointments(user_id, date_key);
create index if not exists idx_transferred_user_date on public.transferred_tasks(user_id, for_date);
