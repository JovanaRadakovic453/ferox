-- Celodnevni Google događaji sami ulaze u plan — kao obični zadaci.
--
-- Zašto: događaj bez vremena ne može da bude termin (termin traži sat), pa je do
-- sada morao ručno da se doda dugmetom "Dodaj". Sada se uvlači sam, kao običan
-- zadatak koji se štiklira i broji u dan — isto kao događaj sa vremenom.
--
--  • tasks.google_event_id        — veza sa događajem u Google-u; sprečava duplo uvlačenje.
--  • day_entries.google_dismissed — id-jevi događaja koje je korisnik sklonio (✕).
--
-- Zašto "nadgrobni" spisak stoji na DANU, a ne kao `dismissed` kolona na zadatku
-- (kao kod termina): zadatke čita pola aplikacije (početna, kalendar, istorija,
-- uvidi, EOD). Sklonjen zadatak koji ostaje u tabeli bi se svuda računao kao
-- nezavršen i kvario statistiku. Ovako se zadatak stvarno briše, a dan pamti da
-- taj događaj ne treba ponovo uvlačiti.
--
-- Aditivno i nedestruktivno.

begin;

alter table public.tasks
  add column if not exists google_event_id text;

alter table public.day_entries
  add column if not exists google_dismissed text[] not null default '{}';

-- Jedan Google događaj = najviše jedan zadatak po danu.
create unique index if not exists idx_tasks_google_event
  on public.tasks(entry_id, google_event_id)
  where google_event_id is not null;

commit;
