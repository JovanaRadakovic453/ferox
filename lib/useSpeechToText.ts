'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Govor → tekst preko ugrađenog Web Speech API-ja (besplatno, klijentski, bez
// tajni). Vraća finalne delove transkripta kroz onResult. Podrazumevani jezik je
// srpski. Neki pregledači (Firefox) ga nemaju — tada je `supported` false pa se
// dugme mikrofona sakrije.

interface SpeechAlternative { transcript: string }
interface SpeechResultLike { isFinal: boolean; 0: SpeechAlternative }
interface SpeechEventLike { resultIndex: number; results: ArrayLike<SpeechResultLike> }
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useSpeechToText({
  lang = 'sr-RS',
  onResult,
  onError,
}: {
  lang?: string
  onResult: (text: string) => void
  onError?: (code: string) => void
}) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  // Uvek najsvežiji callback-ovi (bez re-kreiranja recognizera).
  // Osvežavamo ih POSLE rendera — dodela tokom rendera je greška (react-hooks/refs).
  // Čitaju se samo iz rec.onresult/onerror, koji okidaju kasnije, pa je bezbedno.
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
  })

  useEffect(() => {
    setSupported(!!getCtor())
    return () => { recRef.current?.abort() }
  }, [])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      let finalText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript
      }
      finalText = finalText.trim()
      if (finalText) onResultRef.current(finalText)
    }
    rec.onerror = (e) => {
      // "aborted"/"no-speech" su bezopasni (npr. korisnik prekine) — ne davi porukom.
      if (e.error !== 'aborted' && e.error !== 'no-speech') onErrorRef.current?.(e.error)
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      // start() dva puta zaredom baci — ignoriši.
    }
  }, [lang])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  return { supported, listening, start, stop, toggle }
}
