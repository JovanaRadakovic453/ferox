create table public.routines (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  tasks jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.routines enable row level security;
create policy "Users manage own routines"
  on public.routines for all using (auth.uid() = user_id);
