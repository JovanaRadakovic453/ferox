# Ferox — Claude Code kontekst

## Šta je Ferox
Energy-adaptive daily planner za balkansko tržište (srpski jezik). Planira dan
prema **energiji** korisnika, ne fiksnom rasporedu. Target: ADHD/neurodivergentni
profesionalci i freelanceri.

**Tagline:** "Svi planeri pretpostavljaju da si svaki dan ista osoba. Nisi."

Tok dana: korisnik uveče/ujutru uradi **Setup** (energija + san + zadaci) →
`/api/day/create` snimi dan → **Plan** ekran rasporedi zadatke po blokovima dana →
na kraju **EOD** (završi dan) prebaci nedovršene zadatke za sutra.

## Tech stack
- **Next.js 16.2** (App Router) + **React 19.2** + **TypeScript** + **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth + RLS) preko `@supabase/ssr`
- **AI:** `@anthropic-ai/sdk`, model **`claude-sonnet-4-6`** (samo server-side)
- **Hosting:** Vercel
- UI: `framer-motion` (animacije), `@dnd-kit/*` (drag&drop zadataka),
  `next-themes` (dark mode), `clsx` + `tailwind-merge` (`cn()`)

> ⚠️ **Ovo NIJE Next.js koji znaš** (vidi `AGENTS.md`). Next 16 ima breaking
> promene u odnosu na training data. Pre pisanja Next-specifičnog koda
> (routing, `headers()`/`cookies()`, caching, route handlers) proveri
> `node_modules/next/dist/docs/` i poštuj deprecation notices.

## Pokretanje lokalno
```bash
npm run dev        # http://localhost:3000
./run.sh           # isto + auto-kreira .env.local skelet ako fali
./run.sh build     # production build
```
Node 20+.

## Env varijable (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://scwsifonygvfxiixaiak.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_DLpcNCKEMKoUIHrL1pzDKA_ftfNdn9T
SUPABASE_SERVICE_ROLE_KEY=          # server-only
ANTHROPIC_API_KEY=                  # server-only
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Struktura projekta
```
app/
  (auth)/login/                — Login
  (auth)/register/             — Register
  (auth)/reset-password/       — Reset lozinke
  (app)/                       — Protected rute (auth guard u layout.tsx)
    page.tsx                   — Setup / redirect na /plan / EOD landing (vidi "Routing")
    plan/                      — Plan ekran sa blokovima
    onboarding/                — 5-koračni onboarding (novi korisnici)
    history/                   — Istorija dana (Faza 6)
    insights/                  — Pattern Coach + Energy Forecast (Faza 6)
    settings/                  — Podešavanja + Lab (Faza 7)
  api/
    ai/brain-dump/             — POST: slobodan tekst → Task[]
    ai/replan/                 — POST: "dan se raspao" replanning
    ai/chat/                   — POST: streaming chat asistent
    day/create/                — POST: snimi/azuriraj dan + zadatke (glavni write path)
    day/debug/                 — GET: debug stanja dana
  auth/callback/               — Supabase email potvrda callback
components/
  ui/Button.tsx, Input.tsx, Checkbox.tsx   — base UI
  auth/AuthCard.tsx                        — wrapper za auth ekrane
  onboarding/OnboardingFlow.tsx            — 5-koračna forma (framer-motion)
  setup/SetupScreen.tsx                    — dnevni setup (energija, san, zadaci)
  plan/PlanScreen.tsx                      — plan sa blokovima, toggle, EOD
  plan/EodLanding.tsx                      — "Dan završen" početna
  LogoutButton.tsx
lib/
  supabase/client.ts   — Browser klijent
  supabase/server.ts   — Server klijent (cookies); `createClient()` je async → await
  anthropic.ts         — Anthropic klijent (SAMO server-side)
  date.ts              — dayKey/todayKey/tomorrowKey/addDays (Europe/Belgrade TZ!)
  energy.ts            — calcBlocks(), energyLabel(), energyLevelFromLabel(), sleepQuality()
  utils.ts             — cn(), formatDate(), calcSleepHours()
types/ferox.ts         — Svi tipovi + LABELS (Task, UserProfile, DayEntry, ENERGY_LABELS...)
proxy.ts               — Auth middleware (Next 16 naziv za middleware)
supabase/schema.sql    — SQL schema sa RLS politikama
```

## Supabase model (sve tabele imaju RLS — pristup samo `auth.uid()`)
- `profiles` — korisnički profil; auto-kreiran triggerom `on_auth_user_created`.
  Ključ: `completed_once` (da li je prošao onboarding).
- `day_entries` — jedan red po (`user_id`, `date_key`). `finished_at`:
  `NULL` = aktivan dan, `!= NULL` = završen (EOD).
- `tasks` — vezani za `day_entries.id` preko `entry_id`. `position` čuva redosled.
- `appointments` — termini po `date_key`.
- `transferred_tasks` — `jsonb` zadaci preneseni za naredni dan (`for_date`).

## Ključne konvencije — UVEK POŠTUJ

1. **AI ključ NIKAD na klijentu.** Svi Anthropic pozivi idu kroz `/api/ai/*`.
   Pattern endpointa: auth check → `anthropic.messages.create({ model: 'claude-sonnet-4-6' })`
   → skini ```` ```json ```` ograde → `JSON.parse`. Greške vraćaj kao srpski string.
2. **Srpski jezik** — svi UI stringovi i AI promptovi na srpskom.
3. **Datum dana ide kroz `lib/date.ts`** (`todayKey()`/`tomorrowKey()`), NIKAD
   `new Date().toISOString().split('T')[0]`. Zona je fiksirana na `Europe/Belgrade`
   jer server radi u UTC — inače se oko ponoći `date_key` razilazi i plan "nestane".
4. **Optimistički UI** — odmah prikaži promenu, sync u pozadini.
5. **`proxy.ts`** (ne `middleware.ts`) je Next 16 konvencija za auth redirect.
   Dodatni guard je u `app/(app)/layout.tsx` (server-side `redirect('/login')`).
6. **Server komponente za data fetching**, klijent komponente za interakciju.
   `lib/supabase/server.ts` `createClient()` je **async** — mora `await`.
7. **`/api/day/create` je idempotentan:** ako dan postoji, briše stare `tasks` i
   ponovo ih ubacuje, i postavlja `finished_at = null` (svako snimanje preko dana
   ga **reotvara** — služi i kao undo slučajnog "Završi dan").
8. Referentni fajl za originalnu logiku: `ferox.html` (~4800 linija vanilla JS).

## Routing na `app/(app)/page.tsx`
Početna nije fiksan ekran — bira prema stanju `day_entries` za ciljani datum:
- nema profila / `!completed_once` → `/onboarding`
- `?sutra=1` i plan za sutra postoji → redirect na `/plan?date=...`
- aktivan današnji plan (`finished_at == null`) → redirect na `/plan`
- završen dan (`finished_at != null`) → render `EodLanding`
- inače → `SetupScreen` (sa prenesenim zadacima ako ih ima)

## Dizajn sistem (iz `app/globals.css`)
CSS varijable na `:root`, dark mode preko klase `.dark` na `<html>`
(`next-themes`). Tailwind v4 `@theme inline` mapira ih na utility klase
(`bg-surface`, `bg-bg`, `text-ferox-text`, `text-muted`, `border-border`,
`text-gold`, ...).

**Boje (light):**
```
--bg #EAD9C8   --surface #FDF8F3   --surface2 #F5EDE3
--gold #D4742A   --gold-light #E8924A   --gold-deep #B85C1E
--text #1A1714   --text-muted #6B5F54   --border #D9C9B8
```
**Radii:** `--r-sm 10px` `--r-md 14px` `--r-lg 18px` `--r-xl 24px` `--r-full 999px`
**Senke:** `--sh-xs/sm/md/lg`, `--sh-gold` (sve tople).
**Fontovi:** `--font-serif` (Cormorant Garamond → naslovi/logo),
`--font-sans` (Outfit → ostalo).

**Pravila:** mobile-first, max-width ~520px; nikad čista bela/crna — uvek topli
tonovi; radius 14px kartice / 12px inputi / 10px mali elementi.

## Stanje projekta
- ✅ Faza 0–1: Next 16 setup, Supabase, Vercel, Auth (login/register/callback/reset)
- ✅ Faza 3: 5-koračni onboarding
- ✅ Faza 4: Setup + Plan ekran + EOD flow (+ veliki UI refactor, design system)
- 🔶 Faza 5: AI proxy — endpointi (`brain-dump`, `replan`, `chat`) postoje, UI delom
- ⬜ Faza 6: History & Insights (Pattern Coach, Energy Forecast)
- ⬜ Faza 7: Lab (Pomodoro, water tracker, kalendar)
- ⬜ Faza 8: Polish (PWA, animacije, share card)
- ⬜ Faza 9: Launch (custom domen, analytics, Sentry)

## Deploy
Deploy ide preko **git push** — Vercel automatski builduje i deployuje na svaki
push na `main`.
```bash
git push origin main     # → auto-deploy na ferox-phi.vercel.app
```
GitHub: https://github.com/JovanaRadakovic453/ferox
