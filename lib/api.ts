import { NextResponse } from 'next/server'

// Standardizovan oblik odgovora svih API ruta: { error: { code, message, detail? } }.
export type ApiErrorBody = { error: { code: string; message: string; detail?: unknown } }

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function apiError(code: string, message: string, status = 400, detail?: unknown) {
  const body: ApiErrorBody = { error: { code, message, ...(detail !== undefined ? { detail } : {}) } }
  return NextResponse.json(body, { status })
}

// Najčešće greške sa srpskim porukama — jedno mesto istine.
export const ERR = {
  unauthorized: () => apiError('UNAUTHORIZED', 'Niste prijavljeni', 401),
  invalidInput: (detail?: unknown) => apiError('INVALID_INPUT', 'Neispravni podaci', 400, detail),
  aiUnavailable: (detail?: unknown) => apiError('AI_UNAVAILABLE', 'AI trenutno nije dostupan', 502, detail),
  conflict: (code: string, message: string, detail?: unknown) => apiError(code, message, 409, detail),
  rateLimited: () => apiError('RATE_LIMITED', 'Previše zahteva — sačekaj malo pa pokušaj ponovo', 429),
  server: (detail?: unknown) => apiError('SERVER_ERROR', 'Došlo je do greške na serveru', 500, detail),
}
