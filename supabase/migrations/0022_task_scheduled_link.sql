-- 0022: spajalica između zadatka u planu i zakazanog zadatka iz Kalendara.
--
-- ZAŠTO: do sada se `scheduled_tasks.done` postavljao na true čim zadatak UĐE u
-- plan. Dok je zakazan zadatak važio za tačno jedan dan to je bilo isto što i
-- "završen". Otkad zadatak ostaje u planu SVAKI DAN dok se ne završi (projekat se
-- radi više dana pre roka), to su dve različite stvari:
--   • ušao u plan  → i dalje nije gotov, sutra treba opet da se pojavi
--   • štikliran    → gotov, više se ne pojavljuje
--
-- Bez veze nazad ka originalu ne može se znati KOJI zakazani zadatak da se zatvori
-- kad korisnik štiklira zadatak u planu. Ova kolona je ta veza.
--
-- `on delete set null`: ako se zakazan zadatak obriše iz Kalendara, zadatak u planu
-- (i istorija) preživljava — samo gubi vezu.
--
-- Nedestruktivno: samo dodaje kolonu. Stari zadaci ostaju sa null i ponašaju se
-- kao i do sada.

alter table public.tasks
  add column if not exists scheduled_id uuid references public.scheduled_tasks(id) on delete set null;

create index if not exists idx_tasks_scheduled on public.tasks(scheduled_id);
