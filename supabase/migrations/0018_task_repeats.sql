-- 0018: zadaci koji se ponavljaju ("svakog utorka", "svakog radnog dana", "svakog 1.").
--
-- Model: pravilo NE zamenjuje zakazane zadatke — ono ih PRAVI. Svako pojavljivanje
-- postaje običan red u scheduled_tasks, pa kalendar, plan dana, rokovi i podsetnici
-- rade bez ijedne izmene. Logika datuma je u lib/repeat.ts (pokrivena testovima).
--
-- Nedestruktivno: nova tabela + jedna nova kolona.

create table if not exists public.task_repeats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- šablon zadatka koji se pravi na svako pojavljivanje
  name text not null,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  note text not null default '',

  -- pravilo ponavljanja
  freq text not null check (freq in ('daily', 'weekdays', 'weekly', 'monthly')),
  weekdays smallint[] not null default '{}',  -- za 'weekly': 0=nedelja … 6=subota
  month_day smallint check (month_day is null or month_day between 1 and 31), -- za 'monthly'

  start_date date not null,
  end_date date default null,                 -- null = bez kraja
  active boolean not null default true,       -- false = zaustavljeno (istorija ostaje)

  -- dokle su unapred napravljena pojavljivanja; služi da se dopunjuje horizont
  generated_through date,

  created_at timestamptz not null default now()
);

alter table public.task_repeats enable row level security;

create policy "Users manage own task repeats" on public.task_repeats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_task_repeats_user_active
  on public.task_repeats(user_id, active);

-- Veza pojavljivanja → pravilo.
-- NAMERNO `set null`, ne `cascade`: kad korisnik obriše seriju, ODRAĐENA
-- pojavljivanja iz prošlosti moraju da ostanu u istoriji. Buduća, nezavršena
-- briše app eksplicitno.
alter table public.scheduled_tasks
  add column if not exists repeat_id uuid references public.task_repeats(id) on delete set null;

create index if not exists idx_scheduled_tasks_repeat
  on public.scheduled_tasks(repeat_id);
