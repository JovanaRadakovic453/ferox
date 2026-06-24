# Ferox — Claude Code kontekst

## Šta je Ferox
Energy-adaptive daily planner za balkansko tržište (srpski jezik). Planira dan
prema **energiji** korisnika, ne fiksnom rasporedu. Target: ADHD/neurodivergentni
profesionalci i freelanceri.

**Tagline:** "Svi planeri pretpostavljaju da si svaki dan ista osoba. Nisi."

Tok dana: korisnik uveče/ujutru uradi **Setup** (energija + san + zadaci, uz
AI brain-dump) → `/api/day/create` snimi dan → **Plan** ekran rasporedi zadatke
po blokovima dana **prema energiji i hronotipu** (energetski motor) → tokom dana
checkuje zadatke / pita **Coach** → na kraju **EOD** (završi dan): AI recap,
refleksija, streak, prenos nedovršenih zadataka i "posej za sutra".

## Tech stack
- **Next.js 16.2** (App Router) + **React 19.2** + **TypeScript** + **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth + RLS) preko `@supabase/ssr`
- **AI:** `@anthropic-ai/sdk`, model **`claude-sonnet-4-6`** (samo server-side; tool-use + prompt caching)
- **Validacija:** `zod` (sve API rute) · **Testovi:** `vitest`
- **Hosting:** Vercel
- UI: `framer-motion` (animacije/Toast/Modal), `@dnd-kit/*` (drag&drop — instaliran),
  `next-themes` (dark mode), `clsx` + `tailwind-merge` (`cn()`)

> ⚠️ **Ovo NIJE Next.js koji znaš** (vidi `AGENTS.md`). Next 16 ima breaking
> promene u odnosu na training data. Pre pisanja Next-specifičnog koda
> (routing, `headers()`/`cookies()`, caching, route handlers) proveri
> `node_modules/next/dist/docs/` i poštuj deprecation notices.

## Pokretanje lokalno
```bash
npm run dev            # http://localhost:3000
npm test               # vitest (unit testovi za lib/)
npx tsc --noEmit       # type-check (ne radi TLS → ne pada od cert buga)
```
Node 20+.

> ⚠️ **Windows cert bug (Node 22 na petar-ovoj mašini):** `npm install` i
> `next build` padaju sa `X509_STORE_add_cert` assertion-om (TLS pri svakom
> network pozivu). Workaround (bez slabljenja TLS-a):
> 1. izvuci Node-ove root sertifikate u PEM:
>    `node -e "const fs=require('fs'),os=require('os'),p=require('path');fs.writeFileSync(p.join(os.tmpdir(),'node-ca.pem'),require('tls').rootCertificates.join('\n'))"`
> 2. instaliraj/builduj sa:
>    `$env:NODE_OPTIONS='--use-openssl-ca'; $env:NODE_EXTRA_CA_CERTS=(Join-Path $env:TEMP 'node-ca.pem'); npm install`
> Za HTTP pozive iz skripti koristi `curl` (ne Node `fetch`) da zaobiđeš bug.

## Env varijable (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://scwsifonygvfxiixaiak.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_DLpcNCKEMKoUIHrL1pzDKA_ftfNdn9T
SUPABASE_SERVICE_ROLE_KEY=          # server-only (potrebno za brisanje naloga)
ANTHROPIC_API_KEY=                  # server-only
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Struktura projekta
```
app/
  (auth)/login | register | reset-password   — Auth ekrani (AuthCard)
  (app)/                       — Protected (auth guard u layout.tsx → AppChrome)
    page.tsx                   — Setup / redirect na /plan / EodLanding (vidi "Routing")
    plan/                      — Plan ekran + plan/loading.tsx (skeleton)
    onboarding/                — 5-koračni onboarding (novi korisnici)
    history/                   — Istorija dana (server fetch → HistoryView client)
    insights/                  — Pattern Coach (AI) + Energy Forecast + grafici
    settings/                  — Profil/prefs/tema + GDPR export/brisanje
    loading.tsx / error.tsx    — skeleton + error boundary
  providers.tsx                — ThemeProvider + ToastProvider + SwRegister (root)
  api/
    ai/brain-dump/             — POST tool-use: tekst → { tasks[], appointments[] }
    ai/replan/                 — POST: "dan se raspao" → { danas, sutra, obrisi, poruka }
    ai/chat/                   — POST: streaming Coach (text/plain stream)
    ai/eod/                    — POST: topli EOD recap (kešira u day_entries.eod_recap)
    ai/insights/               — POST tool-use: agregati → { insights[] } (Pattern Coach)
    day/create/                — POST: glavni write path (preko lib/day/createDay)
    account/export | delete/   — GDPR export (JSON) / brisanje naloga (service role)
  auth/callback/               — Supabase email potvrda callback
components/
  ui/Button|Input|Checkbox     — base UI
  ui/Toast.tsx                 — ToastProvider + useToast() (queue, framer-motion)
  ui/Modal.tsx                 — pristupačan focus-trapped dialog (role=dialog, Esc); placement: 'center' (bottom-sheet→centriran) | 'drawer' (bottom-sheet→desni full-height drawer na ≥lg)
  ui/ThemeToggle.tsx           — light/dark/system (next-themes); prop `compact` = ikon-only segmentirani (za sidebar)
  auth/AuthCard.tsx
  nav/AppChrome.tsx            — RESPONSIVNI SHELL: desktop Sidebar (≥lg) + mobilni TabBar (<lg) + ChromeContext(useChrome) + Coach. setHidden() krije SAMO mobilni bar (sidebar ostaje)
  nav/SwRegister.tsx           — registruje service worker (PWA)
  nav/InstallBanner.tsx        — "Dodaj na početni ekran" (beforeinstallprompt)
  chat/CoachSheet.tsx          — Coach chat UI (čita /api/ai/chat stream)
  onboarding/OnboardingFlow.tsx
  setup/SetupScreen.tsx        — setup (energija, san, brain-dump, overload guard)
  plan/PlanScreen.tsx          — plan, blokovi, toggle PO ID-u, modali, EOD, voda
  plan/DayProgress.tsx         — segmentirani progres (izdvojeno, reusable)
  plan/EodLanding.tsx          — "Dan završen": recap + refleksija + streak + posej sutra
  history/HistoryView.tsx      — istorija (client): grafik realizacije (7d mob / 14d desktop) + grid kartica dana
  insights/InsightsView.tsx    — grafici + forecast + AI uvidi (client; dashboard grid na desktopu)
  settings/SettingsForm.tsx    — sva podešavanja + nalog
  LogoutButton.tsx
lib/
  supabase/client.ts | server.ts (async!) | admin.ts (service role)
  anthropic.ts         — Anthropic klijent (SAMO server-side)
  config.ts            — centralni TUNABLES: AI (model/max_tokens/capovi), DEFAULTS (voda/pomodoro/podsetnik/streak), APP (meta/url)
  ai/prompts.ts        — FEROX_PERSONA + TASK_TYPE_GUIDE (jedan izvor istine, keširano)
  ai/parse.ts          — extractText() (sigurno čitanje AI text bloka)
  api.ts               — apiOk / apiError / ERR (standardni { error:{code,message} })
  validation.ts        — zod sheme (sve rute) + enum-i + zStrictDate/zTime
  date.ts              — dayKey/todayKey/tomorrowKey/addDays/isValidDayKey (Europe/Belgrade!)
  energy.ts            — calcBlocks() (hronotip-težinski), energyLabel() (čita ENERGY_LABELS — jedan izvor), sleepQuality()
  plan.ts              — ENERGETSKI MOTOR (vidi dole) — čiste, testirane funkcije
  streak.ts            — computeStreak() (rest-day-aware)
  insights.ts          — computeAggregates() + forecastTomorrow() (čisto)
  day/createDay.ts     — jedinstveni validirani insert dana (rute + quick-start dele ga)
  useCountUp.ts        — animacija brojača
  utils.ts             — cn(), formatDate(), calcSleepHours()
types/ferox.ts         — Svi tipovi + LABELS (Task, UserProfile, DayEntry, ENERGY_LABELS...)
proxy.ts               — Auth middleware (Next 16 naziv za middleware)
public/                — manifest.json, sw.js, icon.svg, icon-maskable.svg (PWA)
supabase/schema.sql    — pun schema (sa RLS); migracije u supabase/migrations/
tests/engine.test.ts   — vitest (calcBlocks, energy-fit, capacity, date, sleep)
```

## Supabase model (sve tabele imaju RLS — pristup samo `auth.uid()`)
- `profiles` — profil; auto-kreiran triggerom `on_auth_user_created`.
  - `completed_once` (onboarding), `rhythm` (hronotip), `rest_days` (slobodni dani),
    `morning_tasks`/`evening_tasks` (navike), `last_sleep_time`/`start_time`.
  - **Novo:** `best_streak`, `theme`, `micro_feedback`, `sound_enabled`, `pomodoro_minutes`.
- `day_entries` — jedan red po (`user_id`, `date_key`). `finished_at`: `NULL` =
  aktivan dan, `!= NULL` = završen (EOD).
  - `energy` (emoji label, za prikaz) **+ `energy_level` (smallint 1–5, izvor istine)**.
  - `water_intake`/`water_goal`, **`reflection`**, **`eod_recap`** (keš AI recapa).
- `tasks` — vezani za `day_entries.id` (`entry_id`). `position` (redosled) **+
  `block_index` (0–3 ručni override; `null` = motor sam raspoređuje)**.
- `appointments` — termini po `date_key` (`time` HH:MM, `reminder` min).
- `transferred_tasks` — `jsonb` zadaci preneseni za naredni dan (`for_date`).

**Migracije:** `supabase/migrations/0002_complete.sql` (energy_level + backfill,
block_index, reflection/eod_recap, profile prefs). Primeni preko Supabase SQL
editora ili Management API-ja (`POST /v1/projects/{ref}/database/query`, Bearer PAT).
Uvek dodaj iste kolone i u `supabase/schema.sql` (za svež DB).

## Energetski motor (`lib/plan.ts`) — srž proizvoda
Ranije je raspored bio round-robin (energija nije ništa radila). Sad:
- `typeEnergyDemand` — koliko svaki od 12 tipova zadatka traži energije (0–1;
  analytical/creative/learning visoko, light/admin/communication nisko, rest/meditation restorativno).
- `blockEnergyCurve(rhythm)` — 4 vrednosti dostupne energije po bloku, po hronotipu
  (morning rano visoko, evening kasno visoko, midday u sredini, mixed ravno).
- `dailyFactor(level)` — skalira celu krivu prema dnevnoj energiji (level 1 = ×1.0, level 5 = ×0.2).
- `assignTasksToBlocks(tasks, blocks, energy_level, rhythm)` — pohlepno: ručni
  `block_index` prvo, pa najteži zadaci u blok gde im fit (demand ≈ dostupna energija)
  najbolji; pri niskoj energiji se teški poslovi koncentrišu u **vrh dana**. Vraća
  `PlanBlock[]` sa `peak` i `rationale` ("zašto baš ovde").
- `capacity(level)` / `isHeavy(task)` → **overload guard** u Setupu (predloži prenos
  teških zadataka za sutra kad ih je previše za izabranu energiju).
- `calcBlocks()` u `lib/energy.ts` je sad **hronotip-težinski** i NE gubi sate
  (stari `Math.floor` je odsecao ostatak).

## Ključne konvencije — UVEK POŠTUJ

1. **AI ključ NIKAD na klijentu.** Svi Anthropic pozivi kroz `/api/ai/*`.
   - Strukturirani izlaz → **tool-use** (`tool_choice`), ne parsiranje teksta
     (brain-dump, insights, eod). Slobodan tekst (chat) → stream.
   - Persona/taksonomija iz `lib/ai/prompts.ts` ide kao **keširan** system blok
     (`cache_control: { type: 'ephemeral' }`). Uvek imaj **deterministički fallback**.
   - Model i parametri (`max_tokens`, capovi) iz `lib/config.ts` (`AI`) — bump
     modela se radi na JEDNOM mestu, ne u 5 ruta.
2. **Energija je `1 = best`** (🔥 Pun gas = 1 … 🪫 = 5). `energy_level` se čuva
   tačno kao nivo iz pickera. Motor interno koristi `6 - level`, ali kolona/analitika
   su uvek 1=best. NE invertuj.
3. **Mutacije PO `id`-u, ne po imenu.** Toggle/update tasks/appointments preko
   `.eq('id', ...)`; batch preko `.in('id', ids)`. (Duplo ime se više ne sudara.)
   Novi redovi se ubacuju sa `.select('id')` da odmah nose id.
4. **Sve API rute:** `zod` validacija ulaza (`lib/validation.ts`) → standardni
   odgovor preko `lib/api.ts` (`apiOk` / `ERR.*`). Oblik greške:
   `{ error: { code, message, detail? } }` (klijent čita `body.error.message`).
5. **Srpski jezik** — svi UI stringovi i AI promptovi.
6. **Datum dana ide kroz `lib/date.ts`** (`todayKey()`/`tomorrowKey()`), NIKAD
   `new Date().toISOString()`. Zona je `Europe/Belgrade` (server je UTC — inače se
   oko ponoći `date_key` razilazi i plan "nestane"). `isValidDayKey` radi round-trip
   (odbija 2024-13-45).
7. **Optimistički UI + rollback.** Promeni stanje odmah; na DB grešku vrati staro
   stanje i prikaži `useToast()` poruku (vidi `ui/Toast.tsx`).
8. **Deljeni primitivi se prave JEDNOM** i koriste svuda: `ui/Toast`, `ui/Modal`,
   `app/providers.tsx`, `plan/DayProgress`, `lib/useCountUp`, `lib/day/createDay`,
   `lib/config`.
9. **`proxy.ts`** (ne `middleware.ts`) je Next 16 konvencija za auth redirect;
   dodatni guard je u `app/(app)/layout.tsx`.
10. **Server komponente za fetching**, klijent za interakciju. `lib/supabase/server.ts`
    `createClient()` je **async** — mora `await`.
11. **`/api/day/create` je idempotentan** (preko `lib/day/createDay`): ako dan postoji,
    briše stare `tasks`, ubacuje nove, i `finished_at = null` (svako snimanje **reotvara**
    dan — undo slučajnog "Završi dan"). Piše i `energy` i `energy_level`. Count-mismatch
    je sad prava 409 greška.
12. **Tunables → `lib/config.ts`.** NE hardkoduj broj/string koji bi se menjao
    (model, `max_tokens`, capovi, voda/pomodoro/podsetnik/streak, app meta). `AI`/`APP`
    su `as const` (literal tipovi); `DEFAULTS` namerno NIJE (numeričke vrednosti ostaju
    `number`). Tajne (ključevi, service-role) OSTAJU u `process.env`, ne u configu.

## Navigacija
`app/(app)/layout.tsx` samo prosleđuje u `AppChrome`, koji JE responsivni shell
(vidi "Responsivni layout"):
- **<lg (mobilni/tablet):** fiksni donji **TabBar** (Danas / Istorija / Uvidi /
  Podešavanja, `aria-current`, active gold pill) + plivajući **Coach (💬)** + **InstallBanner**.
- **≥lg (desktop):** levi **Sidebar** (logo, isti nav vertikalno, Coach dugme,
  `ThemeToggle compact`); TabBar/FAB/InstallBanner su `lg:hidden`.
- Iste `TABS` (sa `match(pathname)`) hrane i sidebar i TabBar — jedan izvor istine.
- Ekrani sa sopstvenim sticky CTA (npr. `SetupScreen`) zovu `useChrome().setHidden(true)`
  → krije **samo mobilni bar** (sidebar ostaje, jer ima svoj rail CTA na desktopu).
- `/onboarding` je full-bleed (bez ikakvog chrome-a) — vlastiti split-screen layout.

## Routing na `app/(app)/page.tsx`
- nema profila / `!completed_once` → `/onboarding`
- `?sutra=1` i plan za sutra postoji → redirect na `/plan?date=...`
- aktivan današnji plan (`finished_at == null`) → redirect na `/plan`
- završen dan (`finished_at != null`) → `EodLanding` (+ streak, recap, posej sutra)
- inače → `SetupScreen` (sa prenesenim zadacima ako ih ima)

## Dizajn sistem (iz `app/globals.css`)
CSS varijable na `:root`, dark mode preko klase `.dark` na `<html>` (`next-themes`,
`attribute="class"`, `defaultTheme="system"`). Tailwind v4 `@theme inline` mapira
varijable na utility klase (`bg-surface`, `text-gold`, `border-border`, ...).

**Boje (light):**
```
--bg #EAD9C8   --surface #FDF8F3   --surface2 #F5EDE3
--gold #D4742A   --gold-light #E8924A   --gold-deep #B85C1E
--text #1A1714   --text-muted #6B5F54   --border #D9C9B8
```
**Radii:** `--r-sm 10px` `--r-md 14px` `--r-lg 18px` `--r-xl 24px`
**Senke:** `--sh-xs/sm/md/lg`, `--sh-gold`. **Fontovi:** `--font-serif`
(Cormorant Garamond → naslovi/logo), `--font-sans` (Outfit → ostalo).
**Utility:** `.card` (+`.card-interactive` hover-lift), `.field`, `.foil`, `.glass`,
`.section-label`, `.title-serif`/`.display`, `.sr-only`, `.skeleton`.
**Layout (responsive shell):** `.app-shell` / `.app-viewport` / `.app-content` /
`.app-sidebar` / `.nav-item` / `.rail-sticky` (vidi "Responsivni layout").

**Pravila:** mobile-first ALI responsive do desktopa (vidi "Responsivni layout"): mobilni
540px kolona → desktop sidebar + sadržaj do 1200px. Nikad čista bela/crna — uvek topli
tonovi; radius 14px kartice / 12px inputi / 10px mali elementi; `prefers-reduced-motion` ispoštovan.

## Responsivni layout (mobilni → tablet → desktop)
**Jedan kod, jedan prelaz.** Desktop se uključuje na **`lg` (1024px)** — i u CSS-u
(`@media (min-width:1024px)` u `globals.css`) i u Tailwind klasama (`lg:`). Ne uvodi
nove breakpointe bez razloga; drži prelaz na `lg`.

Shell živi u `AppChrome` + `globals.css`:
- **`.app-shell`** — `<lg`: običan blok; **`≥lg`: CSS grid `[var(--sidebar-w) minmax(0,1fr)]`**.
- **`.app-sidebar`** — `display:none` na mobilnom; `≥lg` sticky, full-height vertikalni rail.
- **`.app-viewport` / `.app-content`** — vlasnici centriranja i širine: mobilni 540px
  kolona → **tablet (540–1023) uokvireni "sheet"** → desktop sadržaj do `--content-max`.
- **Mobilni TabBar + Coach FAB + InstallBanner**: `lg:hidden`.

Tokeni u `:root`: `--sidebar-w 16.5rem`, `--content-max 75rem` (1200px), `--rail-w 20rem`.

**Po-ekran desktop obrazac** (sve preko `lg:` klasa; mobilni ostaje jedna kolona, dotegnut):
- **Plan** — status traka (progres + voda) → blokovi u **2-kol grid** + sticky **rail akcija** (`--rail-w`).
- **Setup** — forma levo + sticky **"Pregled" rail** (energija / san / kapacitet meter + CTA); fiksni CTA je `lg:hidden`.
- **EOD** — centrirana fokus-kolona (`lg:max-w-2xl`), veći tipografski naglasak.
- **History** — grafik 7d (mob) / 14d (desktop) + kartice u 1 / 2 / 3-kol grid.
- **Insights** — dashboard: prognoza + ukupno (2-kol), AI uvidi (2-kol), 3 grafika (3-kol).
- **Settings** — sekcije u 2-kol grid (`lg:max-w-5xl`), centriran "Sačuvaj", nalog 2-kol.
- **Onboarding** — split-screen: brand/tagline panel (levo, `≥lg`) + koraci (desno).
- **Coach** — `Modal placement="drawer"`: bottom-sheet (mob) → desni full-height drawer (desktop).

> ⚠️ **Tailwind v4 layer gotcha (display utilities):** custom klase u `globals.css` koje
> setuju `display` (npr. `.section-label` = `inline-flex`) su **unlayered** i POBEĐUJU
> Tailwind `hidden`/`flex`/`block` (koji su u `@layer utilities`). Zato
> `class="section-label hidden lg:flex"` NE krije na mobilnom. Rešenje: display-toggle
> ide na čist wrapper — `<div className="hidden lg:block"><span className="section-label">…`.
> (`.card`/`.field`/`.glass`/`.foil`/`.rail-sticky` ne setuju `display` → na njima rade.)
> Isti koren kao reset-gotcha: unlayered > layered.

## Stanje projekta (energy-adaptive overhaul — grana `feat/energy-adaptive-overhaul`)
- ✅ Auth, onboarding, setup, plan, EOD (osnova)
- ✅ **Energetski motor** — plan stvarno zavisi od energije + hronotipa; overload guard; vrh dana + "zašto baš ovde"
- ✅ **Foundation/trust** — id-mutacije, optimistički rollback + Toast, zod validacija, standardne greške, energy_level
- ✅ **Navigacija** — responsivni shell (desktop Sidebar + mobilni TabBar) + chrome-hide + Coach
- ✅ **AI** — Coach chat UI, tool-use brain-dump (tasks+termini), EOD recap+refleksija, insights, prompt caching
- ✅ **Ekrani** — History, Insights (Pattern Coach + Energy Forecast), Settings (+ GDPR export/delete)
- ✅ **Retencija (bez push)** — PWA (manifest+SW+ikone+install), shame-free streak, mikro-feedback, "posej sutra"
- ✅ **Polish** — a11y (ARIA/sr-only), skeleton/empty/error stanja, dark mode, water tracker, vitest
- ✅ **Responsive / desktop UI** — desktop sidebar shell + per-ekran desktop layout (Plan rail+grid,
  Setup "Pregled" rail, Insights/History/Settings grid, split-screen onboarding, Coach side-drawer);
  mobilni dotegnut. Prelaz na `lg` (1024px). Usput popravljeno: nevidljive trake u History grafiku.
- ⬜ **Odloženo:** push notifikacije (svesno), drag-reorder UI (`@dnd-kit`), Pomodoro,
  share card, Sentry, pun "comeback" ekran posle više dana pauze

## Deploy
Deploy ide preko **git push** — Vercel automatski builduje i deployuje na svaki
push na `main`.
```bash
git push origin main     # → auto-deploy na ferox-phi.vercel.app
```
GitHub: https://github.com/JovanaRadakovic453/ferox
