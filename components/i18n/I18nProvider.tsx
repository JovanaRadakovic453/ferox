'use client'

// Daje rečnik I vremensku zonu svim klijentskim ekranima. Oba dolaze iz profila
// (server ih pročita jednom u layout-u), pa nema treperenja ni pogađanja.
//
// KLJUČNO za zonu: i server i klijent koriste ISTU vrednost iz profila →
// "koji je danas dan" se uvek poklapa (nema neslaganja oko ponoći).
//
// Serverske komponente NE koriste ovo — one zovu getDict(locale) / profile.timezone.

import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { getDict, sr, type Dict } from '@/lib/i18n/dict'
import { DEFAULT_LOCALE, guessLocale } from '@/lib/locale'
import { DEFAULT_TZ, detectTimezone } from '@/lib/date'
import type { Locale } from '@/types/ferox'

type I18nValue = { t: Dict; locale: Locale; tz: string }
const I18nCtx = createContext<I18nValue>({ t: sr, locale: DEFAULT_LOCALE, tz: DEFAULT_TZ })

export function I18nProvider({ locale, tz, children }: { locale: Locale; tz: string; children: React.ReactNode }) {
  const value = useMemo(() => ({ t: getDict(locale), locale, tz }), [locale, tz])
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>
}

/**
 * Za ekrane PRE prijave (prijava/registracija) — nemamo korisnikov profil, pa
 * jezik i zonu pogađamo iz pregledača. SSR kreće od podrazumevanog (sr/Beograd)
 * da nema neslaganja pri hidraciji, pa se posle prvog rendera prebaci na pogođeno.
 */
export function BrowserI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)
  const [tz, setTz] = useState<string>(DEFAULT_TZ)
  useEffect(() => { setLocale(guessLocale()); setTz(detectTimezone()) }, [])
  const value = useMemo(() => ({ t: getDict(locale), locale, tz }), [locale, tz])
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>
}

/** Tekstovi na jeziku korisnika. */
export const useT = (): Dict => useContext(I18nCtx).t

/** Jezik korisnika — za Intl formatiranje (datumi, brojevi). */
export const useLocale = (): Locale => useContext(I18nCtx).locale

/** Vremenska zona korisnika — prosleđuje se u todayKey/tomorrowKey. */
export const useTimezone = (): string => useContext(I18nCtx).tz
