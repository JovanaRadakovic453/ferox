-- 0016: vremenska zona korisnika
--
-- IANA naziv zone (npr. 'Europe/Belgrade', 'America/New_York'). Prepoznaje se iz
-- pregledača i po njoj se računa "koji je danas dan". Default = Beograd, pa svi
-- postojeći korisnici ostaju tačno kako su sada (nedestruktivno).
--
-- Namerno TEXT bez CHECK enumeracije: IANA lista je velika i menja se; validnost
-- se osigurava u aplikaciji (prepoznato iz Intl-a pregledača).

begin;

alter table public.profiles
  add column if not exists timezone text not null default 'Europe/Belgrade';

commit;
