import type { SupabaseClient } from '@supabase/supabase-js'
import { LOCALES } from '@/types/ferox'
import type { Locale } from '@/types/ferox'

export const DEFAULT_LOCALE: Locale = 'sr'

/** BCP-47 oznaka za Intl (datumi, brojevi) po našem jeziku. */
export const INTL_LOCALE: Record<Locale, string> = { sr: 'sr-Latn-RS', en: 'en-US' }

/** Sve što nije poznat jezik → srpski (stari profili, prazna kolona, smeće u bazi). */
export function toLocale(value: unknown): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE
}

/** Jezik korisnika iz profila — za AI rute. Nikad ne baca; u najgorem slučaju 'sr'. */
export async function getUserLocale(supabase: SupabaseClient, userId: string): Promise<Locale> {
  const { data } = await supabase.from('profiles').select('locale').eq('id', userId).maybeSingle()
  return toLocale(data?.locale)
}

/** Predlog jezika iz pregledača — za ekrane PRE prijave (nemamo profil). Balkan → sr, ostalo → en. */
export function guessLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  const langs = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean)
  return langs.some(l => /^(sr|hr|bs|me|mk|sl)\b/i.test(l)) ? 'sr' : 'en'
}
