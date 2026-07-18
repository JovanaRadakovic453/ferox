-- Google događaji koji sami ulaze u plan dana.
--
-- Zašto: događaj iz Google Kalendara se do sada video SAMO dok se pravi plan, i
-- morao je ručno da se doda dugmetom. Sada se uvlači sam, kao pravi termin — pa
-- se odmah broji u dan i može da se štiklira.
--
--  • google_event_id — veza sa događajem u Google-u; sprečava duplo uvlačenje.
--  • dismissed       — korisnik ga je sklonio (✕). Red OSTAJE kao "nadgrobni",
--                      da se pri sledećem otvaranju ne uveze ponovo. Nigde se ne
--                      prikazuje.
--
-- Aditivno i nedestruktivno.

begin;

alter table public.appointments
  add column if not exists google_event_id text,
  add column if not exists dismissed boolean not null default false;

-- Jedan Google događaj = najviše jedan termin po danu i korisniku.
create unique index if not exists idx_appointments_google_event
  on public.appointments(user_id, date_key, google_event_id)
  where google_event_id is not null;

commit;
