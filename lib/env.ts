// Validacija OBAVEZNIH javnih env varijabli pri importu — misconfigured deploy
// pukne odmah sa jasnom porukom umesto kriptičnog runtime crash-a kasnije.
//
// NEXT_PUBLIC_* su statički ubrizgane od strane Next-a (rade i na klijentu i na
// serveru). Server-only tajne (ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY)
// NAMERNO ostaju opcione i validiraju se tamo gde se koriste:
// lib/supabase/admin.ts vraća null (graceful), a AI rute hvataju grešku.
import { z } from 'zod'

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
  throw new Error(
    `Nedostaju ili su neispravne obavezne env varijable: ${missing}. ` +
      `Proveri .env.local (šablon je .env.example) ili Vercel Project Settings.`,
  )
}

export const env = parsed.data
