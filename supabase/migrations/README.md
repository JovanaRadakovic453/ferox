# Ferox — migracije baze

## Stanje

Na produkciji (Supabase projekat `scwsifonygvfxiixaiak`) primenjene su **sve
migracije zaključno sa `0022_task_scheduled_link.sql`**.

0022 primenjena 2026-07-19 kroz SQL Editor (`tasks.scheduled_id`; kontrolni test:
izmišljena kolona vraća 400, prava prolazi).
0021 primenjena 2026-07-18 kroz SQL Editor; provereno preko PostgREST-a da
`tasks.google_event_id` i `day_entries.google_dismissed` postoje.
0020 primenjena 2026-07-18 kroz SQL Editor; provereno preko PostgREST-a da
`appointments.google_event_id` i `dismissed` postoje.
0019 primenjena 2026-07-19 kroz SQL Editor (`appointments.end_time`;
kontrolni test: izmišljena kolona vraća 42703, prava prolazi).

Ranije: 0018 primenjena (provereno: tabela `task_repeats` postoji).
0017 primenjena 2026-07-19 kroz SQL Editor (`profiles.last_reminder_key`).
0016 primenjena 2026-07-18 kroz SQL Editor (`profiles.timezone`).
0015 primenjena 2026-07-16 kroz SQL Editor (`profiles.locale`).
0014 primenjena 2026-07-16 kroz SQL Editor (`tasks.deadline_date`).
0013 primenjena 2026-07-02 kroz Management API (FK na profiles, cascade).
Fajlovi su numerisani po stvarnom redosledu primene (renumerisano jul 2026 —
ranije su postojali duplikati 0003/0004; sadržaj fajlova nije menjan).

`../schema.sql` je kompletan skript **samo za svež (prazan) Supabase projekat**
i **sustignut je sa migracijama zaključno sa 0022** (2026-07-19). Nikad ga ne
puštaj na postojeću produkciju.

Napomena o redosledu: kolone koje pokazuju na tabelu koja nastaje KASNIJE u fajlu
(`tasks.scheduled_id` → `scheduled_tasks`, `scheduled_tasks.repeat_id` →
`task_repeats`) dodate su preko `alter table` posle tih tabela, ne u `create table`.
Ako dodaješ sličnu vezu, drži se istog obrasca — inače svež projekat pukne.

## Kako se primenjuje nova migracija

1. Napravi novi fajl `NNNN_kratak_opis.sql` (sledeći slobodan broj).
2. Otvori Supabase Dashboard → SQL Editor → nalepi sadržaj → Run.
   (Alternativa: Management API `POST /v1/projects/{ref}/database/query`
   sa Bearer PAT-om.)
3. Ažuriraj `../schema.sql` da svež DB dobije isto stanje.
4. Ažuriraj ovaj README (redni broj primenjene migracije).

Pravila: migracije su **aditivne/nedestruktivne** (kolone se ne brišu — ako
prestanu da se koriste, označe se kao legacy komentarom u schema.sql).
DDL uvek unutar `begin; ... commit;` kad menja postojeće tabele.
