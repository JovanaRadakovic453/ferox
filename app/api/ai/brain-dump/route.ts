import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { apiOk, ERR } from '@/lib/api'
import { brainDumpSchema, aiTaskSchema } from '@/lib/validation'
import { extractText } from '@/lib/ai/parse'

// NOTE: Phase 4 upgrades this to forced tool-use (tasks + appointments). For now:
// strict input validation + hardened parsing with per-task enum repair.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ERR.unauthorized()

  const json = await request.json().catch(() => null)
  const parsed = brainDumpSchema.safeParse(json)
  if (!parsed.success) return ERR.invalidInput(parsed.error.issues)
  const { text } = parsed.data

  let message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Izvuci zadatke iz sledećeg teksta i vrati ih kao JSON niz.

Svaki zadatak ima:
- name (string): kratko ime zadatka na srpskom
- priority (high/medium/low): koliko je hitno
- type: izaberi JEDAN od sledećih tipova. Pazi na primere:
  * creative — pisanje, dizajn, kreativni projekti
  * analytical — analiza podataka, istraživanje, rešavanje problema
  * meetings — sastanci, pozivi, video konferencije
  * communication — mejlovi, poruke, odgovori na upite
  * admin — SAMO kancelarijska birokratija: fakture, ugovori, poslovni dokumenti, prijave
  * light — SVE lične obaveze i erandi: kupovina namirnica, odlazak u prodavnicu, sitni kućni poslovi, zakazivanje pregleda, plaćanje računa, odlazak na poštu
  * rest — pauza, odmor, spavanje, opuštanje
  * learning — učenje, online kursevi, stručna literatura
  * exercise — trčanje, teretana, sport, šetnja, fizička aktivnost
  * planning — planiranje projekta, pravljenje liste, organizacija
  * reading — čitanje knjiga ili članaka za razonodu
  * meditation — meditacija, disanje, mindfulness
- note (string): kratka napomena, može biti prazna

Maksimalno 8 zadataka. Vrati SAMO JSON niz, bez ikakvog drugog teksta.

Tekst: "${text}"`,
      }],
    })
  } catch (err) {
    return ERR.aiUnavailable(err instanceof Error ? err.message : String(err))
  }

  const raw = extractText(message)
  if (!raw) return ERR.aiUnavailable('Prazan AI odgovor')
  try {
    const arr = JSON.parse(raw)
    const tasks = (Array.isArray(arr) ? arr : [])
      .map(t => aiTaskSchema.safeParse(t))
      .flatMap(r => (r.success ? [r.data] : []))
      .slice(0, 8)
    return apiOk({ tasks })
  } catch {
    return ERR.aiUnavailable('Nisam mogao da pročitam zadatke')
  }
}
