# Ferox — migracije baze

## Stanje

Na produkciji (Supabase projekat `scwsifonygvfxiixaiak`) primenjene su
migracije **zaključno sa `0012_google_calendar.sql`**.
**`0013_routines_fk_profiles.sql` još NIJE primenjena** — pusti je kroz SQL
editor pa ažuriraj ovaj red. Fajlovi su numerisani po stvarnom redosledu
primene (renumerisano jul 2026 — ranije su postojali duplikati 0003/0004;
sadržaj fajlova nije menjan).

`../schema.sql` je kompletan skript **samo za svež (prazan) Supabase projekat**
i odgovara stanju posle 0013. Nikad ga ne puštaj na postojeću produkciju.

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
