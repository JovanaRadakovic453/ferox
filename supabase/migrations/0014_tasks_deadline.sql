-- Rok (deadline) na zadatku u planu dana.
--
-- Zašto: rok je do sada postojao SAMO na scheduled_tasks (kalendar). Čim bi
-- zakazani zadatak ušao u plan dana, scheduled_tasks se označi done=true
-- ("prebačen u plan", ne "završen"), a tasks nema kolonu za rok — pa je rok
-- nestajao baš onog dana kad treba da se radi na zadatku, i upozorenje bi ućutalo.
--
-- Ovom kolonom rok prati zadatak do stvarnog završetka.
-- Aditivno i nedestruktivno.

begin;

alter table public.tasks
  add column if not exists deadline_date date default null;

-- Za brzo nalaženje zadataka kojima rok ističe / je prošao.
create index if not exists idx_tasks_user_deadline
  on public.tasks(user_id, deadline_date);

commit;
