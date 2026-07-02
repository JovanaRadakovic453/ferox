# Ferox

**Strukturiran dnevni planer** na srpskom jeziku: plan dana + mesečni kalendar
(rokovi, podsetnici) + oblasti života + rutine, uz AI pomoć (brain-dump →
zadaci, topli rezime dana, "dan se raspao" replan). PWA sa jutarnjim push
podsetnikom i uvozom termina iz Google Kalendara.

## Tech stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase
(Postgres + Auth + RLS) · Anthropic (samo server-side) · zod · vitest · eslint ·
Vercel (+ cron).

## Pokretanje lokalno
```bash
cp .env.example .env.local   # popuni vrednosti (vidi .env.example)
npm run dev                  # http://localhost:3000
npm test                     # vitest (unit testovi za lib/)
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint
```
Node 20+.

> **Windows cert bug (Node 22):** `npm install` / `next build` mogu pasti sa
> `X509_STORE_add_cert` assertion-om. Workaround i detalji su u
> [AGENTS.md](AGENTS.md) ("Pokretanje lokalno").

## Env varijable
Vidi [.env.example](.env.example). Obavezne (validiraju se u `lib/env.ts`):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Sve ostalo
(Anthropic, Google OAuth, VAPID push, CRON_SECRET) je opciono i feature-gated.

## Baza
Pun schema za svež projekat: [supabase/schema.sql](supabase/schema.sql).
Migracije + procedura primene: [supabase/migrations/](supabase/migrations/).
Sve tabele imaju RLS (pristup samo `auth.uid()`).

## Deploy
`git push origin main` → Vercel auto-deploy. CI (GitHub Actions) pušta
lint + typecheck + test na svaki push/PR.

## Arhitektura i konvencije
Puni tehnički vodič (struktura, Supabase model, konvencije): [AGENTS.md](AGENTS.md).
Uputstvo za rad sa vlasnicom projekta: [CLAUDE.md](CLAUDE.md).
