# Ferox — Claude Code kontekst

## Šta je Ferox
Energy-adaptive daily planner za balkansko tržište (srpski jezik). Planira dan prema energiji korisnika, ne fiksnom rasporedu. Target: ADHD/neurodivergentni profesionalci i freelanceri.

**Tagline:** "Svi planeri pretpostavljaju da si svaki dan ista osoba. Nisi."

## Tech stack
- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS v4 (App Router)
- **Backend:** Next.js API Routes (server-side Anthropic proxy)
- **Baza:** Supabase (PostgreSQL + Auth + RLS)
- **Hosting:** Vercel
- **AI:** @anthropic-ai/sdk — MODEL: `claude-sonnet-4-6`

## Pokretanje lokalno
```bash
npm install
npm run dev   # http://localhost:3000
```

## Env varijable (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://scwsifonygvfxiixaiak.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_DLpcNCKEMKoUIHrL1pzDKA_ftfNdn9T
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Struktura projekta
```
app/
  (auth)/login/        — Login stranica
  (auth)/register/     — Register stranica
  (app)/               — Protected rute (auth guard u layout.tsx)
    page.tsx           — Setup ekran (ili redirect na /plan ako plan postoji)
    plan/              — Plan ekran sa blokovima
    onboarding/        — 5-koračni onboarding (novi korisnici)
    history/           — Istorija dana (Faza 6)
    insights/          — Pattern Coach + Energy Forecast (Faza 6)
    settings/          — Podešavanja + Lab (Faza 7)
  api/ai/
    brain-dump/        — POST: slobodan tekst → Task[]
    replan/            — POST: "dan se raspao" replanning
    chat/              — POST: streaming chat asistent
  auth/callback/       — Supabase email potvrda callback
components/
  ui/Button.tsx        — Base dugme (primary/ghost/danger, loading state)
  ui/Input.tsx         — Base input (label, error)
  onboarding/OnboardingFlow.tsx  — 5-koračna forma sa framer-motion
  setup/SetupScreen.tsx          — Dnevni setup (energija, zadaci, spavanje)
  plan/PlanScreen.tsx            — Plan sa blokovima, toggle, EOD
  LogoutButton.tsx               — Klijent komponenta za odjavu
lib/
  supabase/client.ts   — Browser Supabase klijent
  supabase/server.ts   — Server Supabase klijent (cookies)
  anthropic.ts         — Anthropic klijent (SAMO server-side)
  energy.ts            — calcBlocks(), energyLabel(), sleepQuality()
  utils.ts             — cn(), formatDate(), todayKey(), calcSleepHours()
types/ferox.ts         — Svi TypeScript tipovi (Task, UserProfile, DayEntry...)
proxy.ts               — Auth middleware (Next.js 16 naziv za middleware)
supabase/schema.sql    — SQL schema sa RLS politikama
```

## Supabase tabele
- `profiles` — korisnički profil (ritam, razlog, navike, completed_once)
- `day_entries` — dnevni unos (energija, sati sna, voda)
- `tasks` — zadaci vezani za day_entry
- `appointments` — termini/kalendar
- `transferred_tasks` — preneseni zadaci za sutra

## Dizajn sistem
**Boje (CSS varijable):**
```css
--bg: #EAD9C8        /* topla bež pozadina */
--surface: #FDF8F3   /* kartice */
--surface2: #F5EDE3  /* sekundarni elementi */
--gold: #D4742A      /* primarni akcenat */
--text: #1A1714
--text-muted: #6B5F54
--border: #D9C9B8
```
Dark mode: klasa `.dark` na `<html>`.

**Fontovi:**
- `var(--font-serif)` = Cormorant Garamond → naslovi, logo
- `var(--font-sans)` = Outfit → sve ostalo

**Pravila dizajna:**
- Mobile-first, max-width 520px
- Nikad čista bela/crna — uvek topli tonovi
- border-radius: 14px kartice, 12px inputi, 10px mali elementi

## Važna pravila — UVEK POŠTUJ

1. **AI KLJUČ NIKAD NA KLIJENTU** — svi Anthropic pozivi idu kroz `/api/ai/*`
2. **Srpski jezik** — sve UI stringove piši na srpskom
3. **Supabase RLS** — svaka tabela ima Row Level Security
4. **Optimistički UI** — odmah prikaži promenu, sync u pozadini
5. **`proxy.ts`** (ne `middleware.ts`) — Next.js 16 konvencija
6. **Server komponente za data fetching**, klijent komponente za interakciju
7. Referentni fajl za logiku: `ferox.html` (~4800 linija vanilla JS)

## Trenutno stanje (Faza 4 završena)
- ✅ Faza 0: Next.js 16 setup, GitHub, Supabase, Vercel
- ✅ Faza 1: Auth (login, register, callback, protected routes)
- ✅ Faza 3: 5-koračni onboarding sa animacijama
- ✅ Faza 4: Setup ekran + Plan ekran + EOD flow

## Sledeće faze
- **Faza 5:** AI proxy (brain dump, replan, chat) — endpointi postoje, UI nedostaje
- **Faza 6:** History & Insights (Pattern Coach, Energy Forecast)
- **Faza 7:** Lab (Pomodoro, water tracker, kalendar)
- **Faza 8:** Polish (PWA, dark mode, animacije, share card)
- **Faza 9:** Launch (custom domen, analytics, Sentry)

## Deploy
```bash
npx vercel --prod   # deploy na ferox-phi.vercel.app
```
GitHub: https://github.com/JovanaRadakovic453/ferox
