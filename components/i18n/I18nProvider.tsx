'use client'

// Daje rečnik svim klijentskim ekranima. Jezik dolazi iz profila (server ga
// pročita jednom u layout-u), pa nema treperenja ni pogađanja na klijentu.
//
// Serverske komponente NE koriste ovo — one zovu getDict(locale) direktno.

import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { getDict, sr, type Dict } from '@/lib/i18n/dict'
import { DEFAULT_LOCALE, guessLocale } from '@/lib/locale'
import type { Locale } from '@/types/ferox'

const I18nCtx = createContext<{ t: Dict; locale: Locale }>({ t: sr, locale: DEFAULT_LOCALE })

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ t: getDict(locale), locale }), [locale])
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>
}

/**
 * Za ekrane PRE prijave (prijava/registracija) — nemamo korisnikov profil, pa
 * jezik pogađamo iz pregledača. SSR kreće od podrazumevanog (sr) da nema
 * neslaganja pri hidraciji, pa se posle prvog rendera prebaci na pogođeni jezik.
 */
export function BrowserI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)
  useEffect(() => { setLocale(guessLocale()) }, [])
  const value = useMemo(() => ({ t: getDict(locale), locale }), [locale])
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>
}

/** Tekstovi na jeziku korisnika. */
export const useT = (): Dict => useContext(I18nCtx).t

/** Jezik korisnika — za Intl formatiranje (datumi, brojevi). */
export const useLocale = (): Locale => useContext(I18nCtx).locale
