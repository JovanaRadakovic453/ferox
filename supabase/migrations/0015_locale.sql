-- 0015: jezik korisnika
--
-- Bira se pri onboardingu (i menja u Podešavanjima). Za sada utiče na jezik
-- AI odgovora (brain dump, večernji rezime); prevod ekrana ide u sledećoj fazi.
-- Nedestruktivno: postojeći korisnici ostaju na 'sr' preko default-a.

begin;

alter table public.profiles
  add column if not exists locale text not null default 'sr';

-- CHECK dodajemo posebno da migracija bude ponovljiva (add column if not exists
-- ne bi dodao constraint ako kolona već postoji).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_locale_check'
  ) then
    alter table public.profiles
      add constraint profiles_locale_check check (locale in ('sr', 'en'));
  end if;
end $$;

commit;
