// Nedelja u Ferox-u ide PONEDELJAK → NEDELJA (kao u kalendaru), pa se u nedelju
// uveče prirodno zaokruži.
//
// Čista funkcija nad `YYYY-MM-DD` ključem — bez zone i bez `new Date()` nad "sada",
// isto kao lib/repeat.ts. Datum se čita u podne UTC da pomeranje zone nikad ne
// prebaci dan.

/** Indeks dana sa ponedeljkom kao 0 (Pon=0 … Ned=6). */
export function mondayIndex(dateKey: string): number {
  return (new Date(`${dateKey}T12:00:00Z`).getUTCDay() + 6) % 7
}

/** Da li je taj dan nedelja — poslednji dan nedelje, kad se sabira. */
export function isSundayKey(dateKey: string): boolean {
  return mondayIndex(dateKey) === 6
}
