-- Kraj termina (do kada traje).
--
-- Zašto: termin je do sada pamtio SAMO početak. Kad se događaj uvuče iz Google
-- Kalendara ("Sastanak 16–18h"), podatak o kraju se gubio — u planu je pisalo
-- samo "16:00". Ovom kolonom Ferox može da prikaže "16:00 – 18:00".
--
-- Nullable: stari termini i oni uneti ručno (bez kraja) ostaju netaknuti.
-- Aditivno i nedestruktivno.

begin;

alter table public.appointments
  add column if not exists end_time text
  check (end_time is null or end_time ~ '^([01]\d|2[0-3]):[0-5]\d$');

commit;
