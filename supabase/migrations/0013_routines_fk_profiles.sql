-- ============================================================
-- FEROX MIGRATION 0013 — routines FK: auth.users → profiles
-- Sve ostale tabele referenciraju profiles(id); routines je jedina
-- pokazivala direktno na auth.users. Ujednačavamo (isti kaskadni put).
-- Bez rizika od orphan-a: signup trigger garantuje red u profiles.
-- Pokreni u Supabase SQL editoru (unutar transakcije).
-- ============================================================

begin;

alter table public.routines drop constraint if exists routines_user_id_fkey;
alter table public.routines add constraint routines_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

commit;
