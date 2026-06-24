# Ferox

**Energy-adaptive daily planner** za balkansko tržište (srpski jezik). Planira dan
prema **energiji** korisnika i hronotipu, ne fiksnom rasporedu. Target: ADHD/neurodivergentni
profesionalci i freelanceri.

> "Svi planeri pretpostavljaju da si svaki dan ista osoba. Nisi."

Tok dana: **Setup** (energija + san + zadaci, uz AI brain-dump) → energetski motor rasporedi
zadatke po blokovima dana → tokom dana checkuješ zadatke / pitaš **Coach** → **EOD** (završi
dan): AI recap, refleksija, streak, prenos nedovršenih zadataka.

## Tech stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres + Auth + RLS) ·
Anthropic (`claude-sonnet-4-6`, samo server-side) · zod · vitest · Vercel.

## Pokretanje lokalno
```bash
cp .env.example .env.local   # popuni vrednosti (vidi .env.example)
npm run dev                  # http://localhost:3000
npm test                     # vitest (unit testovi za lib/)
npm run typecheck            # tsc --noEmit
```
Node 20+.

> **Windows cert bug (Node 22):** `npm install` / `next build` mogu pasti sa `X509_STORE_add_cert`
> assertion-om. Workaround i detalji su u [CLAUDE.md](CLAUDE.md) ("Pokretanje lokalno").

## Env varijable
Vidi [.env.example](.env.example). Obavezne (validiraju se u `lib/env.ts`):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Server-only tajne
(`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`) su opcione i feature-gated.

## Baza
Pun schema je u [supabase/schema.sql](supabase/schema.sql); migracije u
[supabase/migrations/](supabase/migrations/). Primeni preko Supabase SQL editora ili
Management API-ja. Sve tabele imaju RLS (pristup samo `auth.uid()`).

## Deploy
`git push origin main` → Vercel auto-deploy.

## Arhitektura i konvencije
Detaljan vodič kroz strukturu, energetski motor i obavezne konvencije je u
[CLAUDE.md](CLAUDE.md).
