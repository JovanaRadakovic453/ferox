-- ============================================================
-- FEROX MIGRATION 0003 — per-user rate limiting (Supabase-backed)
-- Atomic fixed-window token bucket via a SECURITY DEFINER function.
-- Used by lib/rateLimit.ts -> supabase.rpc('rate_limit_hit', ...) to cap
-- expensive AI calls and account-delete abuse. No external infra (no Redis).
-- ============================================================

create table if not exists public.rate_limits (
  user_id uuid not null references auth.users on delete cascade,
  route text not null,
  window_start timestamptz not null default now(),
  count int not null default 0,
  primary key (user_id, route)
);

alter table public.rate_limits enable row level security;
-- Namerno BEZ policy-ja: jedini pristup je preko rate_limit_hit (SECURITY DEFINER),
-- direktan pristup anon/authenticated rolom je zabranjen (RLS deny-all).

-- Atomično: jedan UPSERT po pozivu. Resetuje brojač kad prozor istekne,
-- inače inkrementira. Vraća TRUE ako je zahtev unutar limita.
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
    return false; -- nema sesije → odbij
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
