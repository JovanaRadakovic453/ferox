<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Ferox — tehnička dokumentacija (puni kontekst)

> Puni tehnički referentni dokument projekta Ferox: stack, struktura, Supabase
> model, konvencije, deploy. Svakodnevni "kako radim" kontekst je u `CLAUDE.md`.

## Šta je Ferox

**Strukturiran dnevni planer** na srpskom jeziku: dan + mesečni kalendar +
oblasti života + rutine, uz AI pomoć (brain-dump, EOD rezime, replan).

> ℹ️ **Istorijska napomena:** projekat je počeo kao "energy-adaptive planer"
> (raspored po energiji i hronotipu). Taj koncept je **uklonjen iz proizvoda**
> (jul 2026, "pivot cleanup" commit) — motor, energetski UI i analitika su
> obrisani; par legacy kolona ostaje u bazi (vidi Supabase model). Ne vraćaj
> energetske koncepte bez eksplicitne odluke vlasnice.

**Glavne celine:**
- **Danas** — Setup (zadaci + termini + AI brain-dump) → Plan (štikliranje,
  dodavanje, rutine, "Dan se raspao?" AI replan) → Završi dan (AI rezime,
  streak, prenos nedovršenog na sutra).
- **Kalendar** — zakazani zadaci unapred (`scheduled_tasks`): rok (deadline),
  podsetnik, oblast; na dan zakazivanja ulaze u Setup prefill.
- **Oblasti (zones)** — korisničke kategorije (Posao, Fakultet…) na zadacima,
  terminima i zakazanim zadacima; filter u kalendaru.
- **Rutine** — šabloni zadataka koji se jednim klikom primene na plan; +
  break-timer / pomodoro u **Alati** (`/extras`).
- **Retencija** — streak (rest-day-aware), PWA (install + SW), jutarnja push
  notifikacija (jedno fiksno vreme za sve), Google Calendar import termina.

## Tech stack
- **Next.js 16.2** (App Router) + **React 19.2** + **TypeScript** + **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth + RLS) preko `@supabase/ssr`
- **AI:** `@anthropic-ai/sdk`, model iz `lib/config.ts` (`AI.model`; samo
  server-side; tool-use + prompt caching)
- **Validacija:** `zod` (sve API rute) · **Testovi:** `vitest` · **Lint:** `eslint` (flat config)
- **Hosting:** Vercel (auto-deploy na push na `main`) + Vercel Cron (podsetnici)
- UI: `framer-motion` (Toast/Modal animacije), `canvas-confetti`, `next-themes`
  (dark mode), `clsx` + `tailwind-merge` (`cn()`), `web-push` (server)

## Pokretanje lokalno
```bash
npm run dev            # http://localhost:3000
npm test               # vitest (unit testovi za lib/)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
```
Node 20+.

> ⚠️ **Windows cert bug (Node 22 na petar-ovoj mašini):** `npm install` i
> `next build` padaju sa `X509_STORE_add_cert` assertion-om. Workaround:
> 1. `node -e "const fs=require('fs'),os=require('os'),p=require('path');fs.writeFileSync(p.join(os.tmpdir(),'node-ca.pem'),require('tls').rootCertificates.join('\n'))"`
> 2. `$env:NODE_OPTIONS='--use-openssl-ca'; $env:NODE_EXTRA_CA_CERTS=(Join-Path $env:TEMP 'node-ca.pem'); npm install`
> Za HTTP iz skripti koristi `curl`, ne Node `fetch`.

## Env varijable (`.env.local`)
Šablon: `.env.example` (`cp .env.example .env.local`). Obavezne javne varijable
se validiraju pri startu u `lib/env.ts`; ostalo je feature-gated (ruta vrati
grešku ako var fali, app ne pada).

| Varijabla | Za šta | Bez nje |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | baza/auth | app ne kreće (env.ts) |
| `SUPABASE_SERVICE_ROLE_KEY` | brisanje naloga, cron | te rute vraćaju 5xx |
| `ANTHROPIC_API_KEY` | brain-dump, EOD rezime, replan | AI rute vraćaju fallback/502 |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Google Calendar OAuth | "Poveži Google" ne radi |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` | web push | notifikacije ne rade |
| `CRON_SECRET` | auth za `/api/cron/reminders` | cron vraća 401 |
| `NEXT_PUBLIC_APP_URL` | apsolutni linkovi/OAuth redirect | default localhost |

Tajne ostaju u `process.env` — **nikad u kodu ni u `lib/config.ts`**.

## Struktura projekta
```
app/
  (auth)/login | register | reset-password   — Auth ekrani (AuthCard)
  (app)/                       — Protected (guard u layout.tsx → AppChrome)
    page.tsx                   — Routing hub: Setup / redirect na /plan / EodLanding
    plan/                      — Plan ekran (+ plan/loading.tsx skeleton)
    calendar/                  — Mesečni kalendar (zakazani zadaci, rokovi, oblasti)
    extras/                    — "Alati": rutine + break/pomodoro tajmer
    onboarding/                — 4-koračni onboarding (ime, razlog, oblasti, podsetnik)
    history/                   — Istorija dana (server fetch → HistoryView)
    insights/                  — Uvidi: realizacija po danu/tipu + san (server agregacija)
    settings/                  — Profil, tema, oblasti CRUD, notifikacije, Google, GDPR
    loading.tsx / error.tsx    — segment fallback-ovi
  api/
    ai/brain-dump/             — POST tool-use: tekst → { tasks[], appointments[] }
    ai/replan/                 — POST tool-use: "dan se raspao" → { danas, sutra, obrisi, poruka }
    ai/eod/                    — POST: topli EOD rezime (keš u day_entries.eod_recap)
    day/create/                — POST: glavni write path (lib/day/createDay)
    zones/ + zones/[id]        — CRUD oblasti (zod + rate limit)
    scheduled-tasks/ (+[id])   — CRUD zakazanih zadataka (zod + rate limit)
    notifications/subscribe|test — push pretplata / test push
    cron/reminders/            — jutarnji push (Vercel cron; Bearer CRON_SECRET)
    integrations/google/*      — OAuth (auth/callback/disconnect) + events proxy
    account/export | delete/   — GDPR export (sve tabele) / brisanje (service role)
  auth/callback | reset-callback — Supabase email potvrda / reset
components/
  ui/Button|Input|Checkbox|Toast|Modal|ThemeToggle
  auth/AuthCard.tsx
  nav/AppChrome.tsx            — responsivni shell: desktop Sidebar + mobilni TabBar
                                 (TABS: Danas/Kalendar/Istorija/Uvidi/Alati/Podešavanja)
  nav/SwRegister.tsx | InstallBanner.tsx — PWA
  setup/SetupScreen.tsx        — setup (+ TaskEditor, AppointmentEditor, BrainDumpCard,
                                 TransferSuggestions, PreviewRail, primitives)
  plan/PlanScreen.tsx          — plan (+ TaskItem, AppointmentItem, ActionRail,
                                 AddTaskModal, RoutineModal, ReplanModal, ReminderBanner,
                                 DayProgress, EodLanding)
  calendar/CalendarView|CalendarGrid|DayPanel|ZonePanel|Add/EditScheduledTaskModal
  extras/ExtrasScreen|RoutinesSection|BreakAlarmOverlay
  history/HistoryView.tsx · insights/InsightsView.tsx · settings/SettingsForm.tsx
  onboarding/OnboardingFlow.tsx · LogoutButton.tsx
lib/
  supabase/client.ts | server.ts (async!) | admin.ts (service role)
  env.ts               — zod validacija obaveznih javnih env var pri startu
  anthropic.ts         — Anthropic klijent (SAMO server-side)
  config.ts            — TUNABLES: AI (model/max_tokens/capovi), DEFAULTS, RATE_LIMITS, APP
  rateLimit.ts         — checkRateLimit() → Supabase rate_limit_hit RPC (per-user, fail-open)
  ai/prompts.ts        — FEROX_PERSONA + TASK_TYPE_GUIDE (keširan system blok)
  ai/parse.ts          — extractText() (sigurno čitanje AI text bloka)
  api.ts               — apiOk / apiError / ERR (standardni { error:{code,message} })
  validation.ts        — zod sheme; enum-i se uvoze iz types/ferox.ts
  date.ts              — dayKey/todayKey/tomorrowKey/addDays/isValidDayKey (Europe/Belgrade!)
  streak.ts            — computeStreak() (rest-day-aware)
  insights.ts          — computeAggregates() (po danu u nedelji, tipu, san)
  day/createDay.ts     — jedinstveni validirani upis dana
  useCountUp.ts · utils.ts (cn, formatDate, calcSleepHours)
types/ferox.ts         — svi tipovi + enum const-nizovi + LABELS (jedan izvor istine,
                         mora se poklapati sa schema.sql CHECK ograničenjima)
proxy.ts               — Auth middleware (Next 16 naziv za middleware)
public/                — manifest.json, sw.js, ikone (PWA)
supabase/schema.sql    — pun schema za SVEŽ DB · migracije: supabase/migrations/ (vidi README tamo)
tests/                 — date.test.ts, insights.test.ts, streak.test.ts (čiste lib funkcije)
.github/workflows/ci.yml — lint + typecheck + test na push/PR
```

## Supabase model (sve tabele RLS — pristup samo `auth.uid()`)
- `profiles` — auto-kreiran triggerom pri signup-u. Podešavanja (theme,
  micro_feedback, sound, pomodoro_minutes), `completed_once` (onboarding),
  `best_streak`, `push_subscription` (jsonb), `google_access_token` /
  `google_refresh_token` / `google_token_expires_at`, `last_sleep_*`.
  Legacy: `reminder_time`, `rhythm`, `morning_tasks`, `evening_tasks`.
- `day_entries` — jedan red po (`user_id`, `date_key`). `finished_at`: NULL =
  aktivan dan, != NULL = završen. `eod_recap` = keš AI rezimea. `sleep_hours`.
  Legacy: `energy`, `energy_level`, `water_*`, `reflection`.
- `tasks` — po danu (`entry_id`), `priority`, `type` (UI ga više ne bira —
  default 'light'), `note`, `position`, `zone_id`. Legacy: `block_index`.
- `appointments` — termini po `date_key` (`time` HH:MM, `reminder` min, `zone_id`).
- `transferred_tasks` — jsonb zadaci preneseni za `for_date` (unique po user+date).
- `scheduled_tasks` — kalendar unapred: `for_date`, `deadline_date`,
  `remind_before_minutes`, `zone_id`, `done` (postaje true kad zadatak uđe u dnevni plan).
- `zones` — oblasti (name, icon, position).
- `routines` — šabloni (jsonb `tasks`); FK → `profiles` (migracija 0013).
- `rate_limits` + `rate_limit_hit()` (SECURITY DEFINER RPC; deny-all RLS).

**Migracije:** `supabase/migrations/` — numerisane po redosledu primene;
stanje i procedura u `supabase/migrations/README.md`. **Uvek** dodaj promenu i
u `schema.sql` (za svež DB). Nedestruktivno: kolone se ne brišu, označe se kao
legacy.

## Ključne konvencije — UVEK POŠTUJ

1. **AI ključ NIKAD na klijentu.** Svi Anthropic pozivi kroz `/api/ai/*`.
   Strukturiran izlaz → **tool-use** (`tool_choice` forced; brain-dump, replan),
   slobodan tekst (EOD) → `extractText`. `FEROX_PERSONA` ide kao keširan system
   blok (`cache_control: ephemeral`). Uvek deterministički fallback. Model i
   parametri iz `lib/config.ts` — bump na JEDNOM mestu.
2. **Dva obrasca pristupa podacima** (namerno):
   - **API rute** (zod + `apiOk`/`ERR` + `checkRateLimit`): sve AI rute,
     `day/create`, `zones`, `scheduled-tasks`, `notifications`, `google`,
     `account`. Nova ruta MORA imati auth check, zod, standardne greške i
     rate limit ako je mutacija ili trošak.
   - **Klijentski supabase + RLS** (optimistički UI + rollback + Toast):
     toggle/insert/delete `tasks`/`appointments` u PlanScreen-u, `routines`
     CRUD, reset dana. RLS je bezbednosna granica.
3. **Mutacije PO `id`-u, ne po imenu.** `.eq('id', ...)` / `.in('id', ids)`;
   novi redovi se ubacuju sa `.select('id')` da odmah nose id.
4. **Srpski jezik** — svi UI stringovi i AI promptovi.
5. **Datum dana ide kroz `lib/date.ts`** (`todayKey()`/`tomorrowKey()`), NIKAD
   `new Date().toISOString()` za date_key. Zona je `Europe/Belgrade` (server je
   UTC — inače se oko ponoći `date_key` razilazi). `isValidDayKey` radi round-trip.
6. **Optimistički UI + rollback** uz `useToast()` (vidi `ui/Toast.tsx`).
7. **Deljeni primitivi se prave JEDNOM**: `ui/Toast`, `ui/Modal`,
   `app/providers.tsx`, `plan/DayProgress`, `lib/day/createDay`, `lib/config`.
8. **`proxy.ts`** (ne `middleware.ts`) za auth redirect; dodatni guard u
   `app/(app)/layout.tsx`.
9. **Server komponente za fetching**, klijent za interakciju. `lib/supabase/server.ts`
   `createClient()` je **async** — mora `await`. Zone se fetchuju server-side i
   prosleđuju kao prop (ne klijentski useEffect — to je ranije pravilo waterfall).
10. **`/api/day/create` je idempotentan**: postojeći dan → briše stare `tasks`,
    ubacuje nove, `finished_at = null` (reotvara dan). `scheduledTaskIds` u
    body-ju označava zakazane zadatke koji su UŠLI u plan — samo se oni
    markiraju `done` (nikad blanket update).
11. **Tunables → `lib/config.ts`** (model, max_tokens, capovi, rate limiti,
    default minuti…). Tajne NE idu u config.
12. **Cron auth:** `/api/cron/reminders` prima `Authorization: Bearer CRON_SECRET`
    (Vercel konvencija) ili `x-cron-secret` (ručni test). Cron radi jednom
    dnevno (hobby plan) → podsetnik je fiksno jutarnji za sve, preskače
    korisnike koji već imaju današnji plan.
13. **Statusne boje** kroz CSS var: `--danger`/`--warn`/`--ok` (+`-tint`) —
    imaju `.dark` varijante. Ne hardkoduj hex za status/prioritet.
14. **Legacy kolone se ne brišu** iz baze — app prestane da ih koristi, a u
    `schema.sql` dobiju `-- legacy` komentar.

## Routing na `app/(app)/page.tsx`
- nema profila / `!completed_once` → `/onboarding`
- `?sutra=1` i plan za sutra postoji → redirect na `/plan?date=...`
- aktivan današnji plan (`finished_at == null`, bez `?edit=1`) → redirect `/plan`
- završen dan → **EodLanding** (rezime + streak + prenos)
- inače → **SetupScreen** (prefill: preneseni zadaci + zakazani za taj datum;
  `?edit=1` uvlači i naknadno zakazane zadatke u postojeći dan)

## Navigacija i responsive
`AppChrome` je responsivni shell: **<lg** fiksni donji TabBar + InstallBanner;
**≥lg** levi Sidebar (logo, nav, ThemeToggle, streak). Iste `TABS`
(Danas / Kalendar / Istorija / Uvidi / Alati / Podešavanja) hrane oba.
Ekrani sa sopstvenim sticky CTA (Setup) zovu `useChrome().setHidden(true)` —
krije samo mobilni bar. `/onboarding` je full-bleed split-screen.
Prelaz mobilni→desktop je na **`lg` (1024px)** svuda (CSS + Tailwind klase);
ne uvodi nove breakpointe. Tokeni: `--sidebar-w`, `--content-max`, `--rail-w`.

## Dizajn sistem (iz `app/globals.css`)
CSS varijable na `:root`, dark preko `.dark` klase (`next-themes`,
`attribute="class"`, default system). Tailwind v4 `@theme inline` mapira
varijable na utility klase.

**Boje (light):** `--bg #EAD9C8` · `--surface #FDF8F3` · `--surface2 #F5EDE3` ·
`--gold #D4742A` (+light/deep/tint) · `--text #1A1714` · `--text-muted #6B5F54` ·
`--border`, `--hairline` · statusne `--danger/--warn/--ok` (+tint).
**Radii:** `--r-sm 10 / --r-md 14 / --r-lg 18 / --r-xl 24`. **Senke:** `--sh-*`.
**Fontovi:** `--font-serif` (naslovi/logo), `--font-sans` (ostalo).
**Utility klase:** `.card`, `.field`, `.foil`, `.glass`, `.section-label`,
`.title-serif`/`.display`, `.skeleton`, `.rail-sticky`.
Pravila: topli tonovi (nikad čista bela/crna van akcenata), mobile-first do
desktopa, `prefers-reduced-motion` ispoštovan.

> ⚠️ **Tailwind v4 layer gotcha:** custom klase u `globals.css` koje setuju
> `display` (npr. `.section-label` = inline-flex) su unlayered i POBEĐUJU
> Tailwind `hidden`/`flex` (koji su u `@layer utilities`). Display-toggle ide
> na čist wrapper: `<div className="hidden lg:block"><span className="section-label">…`.

## Kvalitet i deploy
- **CI:** `.github/workflows/ci.yml` — lint + typecheck + test na svaki push/PR
  na `main`. CI je informativan (Vercel deployuje nezavisno) — crveni CI znači
  "popravi odmah".
- **Pre pusha:** `npm run typecheck && npm test` (+ `npm run build` lokalno za
  veće promene).
- **Deploy:** `git push origin main` → Vercel auto-build i deploy na
  `ferox-phi.vercel.app`. Cron: `vercel.json` (`0 6 * * *` UTC = 07:00/08:00
  Beograd zavisno od DST).
- GitHub: https://github.com/JovanaRadakovic453/ferox
