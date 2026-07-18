-- 0017: pamti kom danu je korisniku poslat jutarnji podsetnik — po NJEGOVOM
-- lokalnom datumu (YYYY-MM-DD), ne po serverskom.
--
-- Zašto: podsetnik sada stiže u jutro KORISNIKA, pa budilnik lupa rutu svaki sat.
-- Bez ovog ključa bi isti korisnik dobio podsetnik svakog sata unutar jutarnjeg
-- prozora. Prvi poslati podsetnik upiše datum, ostali pokušaji tog dana preskoče.
--
-- null = nikad mu nije poslat podsetnik (tako kreću i svi postojeći korisnici).
-- Nedestruktivno: samo dodaje kolonu.

alter table public.profiles
  add column if not exists last_reminder_key text;
