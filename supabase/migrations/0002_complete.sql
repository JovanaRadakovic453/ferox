-- ============================================================
-- FEROX MIGRATION 0002 — energy-adaptive overhaul (one batch)
-- Canonical energy_level orientation: 1 = best (🔥 Pun gas) … 5 = survival (🪫)
-- Matches existing lib/energy.ts energyLabel() and the SetupScreen picker.
-- ============================================================

-- ---- day_entries: numeric energy mirror (kept alongside emoji `energy` text) ----
alter table public.day_entries
  add column if not exists energy_level smallint
  check (energy_level is null or energy_level between 1 and 5);

comment on column public.day_entries.energy_level is
  '1=Pun gas … 5=Preživljavam; numeric mirror of emoji `energy` text for analytics';

-- Backfill from existing emoji label (ENERGY_LABELS in types/ferox.ts)
update public.day_entries set energy_level = case
  when energy like '🔥%' then 1
  when energy like '😊%' then 2
  when energy like '😐%' then 3
  when energy like '🥱%' then 4
  when energy like '🪫%' then 5
  else null end
where energy_level is null;

-- ---- day_entries: EOD reflection + cached AI recap ----
alter table public.day_entries add column if not exists reflection text;
alter table public.day_entries add column if not exists eod_recap text;

-- ---- tasks: manual placement for drag-reorder / cross-block move ----
-- 0..3 = block index chosen by user; null = let the engine auto-place.
alter table public.tasks add column if not exists block_index smallint
  check (block_index is null or block_index between 0 and 3);

-- ---- profiles: retention + settings preferences ----
alter table public.profiles add column if not exists best_streak int not null default 0;
alter table public.profiles add column if not exists theme text not null default 'system'
  check (theme in ('light', 'dark', 'system'));
alter table public.profiles add column if not exists micro_feedback boolean not null default true;
alter table public.profiles add column if not exists sound_enabled boolean not null default false;
alter table public.profiles add column if not exists pomodoro_minutes smallint not null default 25
  check (pomodoro_minutes between 5 and 90);
