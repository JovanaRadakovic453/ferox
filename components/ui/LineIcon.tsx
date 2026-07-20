import type { ReactNode, CSSProperties } from 'react'

/* Jedan skup tankih linijskih ikona za celu aplikaciju — i zaglavlja kartica i
   glavnu navigaciju. Emodži se na svakom uređaju crta drugačije i uvek šareno,
   pa razbija ton; linija u `currentColor` uzima boju roditelja, tako da u meniju
   sama posivi kad stavka nije aktivna i pozlati se kad jeste. */
export type IconName =
  | 'sparkle' | 'list' | 'calendar' | 'history'
  | 'sun' | 'chart' | 'tools' | 'gear'
  | 'flame' | 'trophy' | 'check' | 'timer' | 'globe' | 'moon'
  | 'mic' | 'pen' | 'bell' | 'repeat' | 'bulb' | 'phone' | 'clock'
  | 'alert' | 'info' | 'offline' | 'note'

const PATHS: Record<IconName, ReactNode> = {
  sparkle: <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1L5 10.5l5.1-1.9z" />,
  list: (
    <>
      <path d="M3.5 6.9l1.7 1.7 3-3.2" />
      <path d="M10.8 7h9.7" />
      <path d="M3.5 15.9l1.7 1.7 3-3.2" />
      <path d="M10.8 16h9.7" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </>
  ),
  history: (
    <>
      <path d="M3.2 12a8.8 8.8 0 108.8-8.8A8.8 8.8 0 005.6 5.9L3.2 8.2" />
      <path d="M3.2 3.8v4.4h4.4" />
      <path d="M12 7.6V12l3 1.8" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M19.1 4.9l-1.5 1.5M6.4 17.6l-1.5 1.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 3.5v15.5a1 1 0 001 1h15.5" />
      <path d="M7.5 15.5l4-4.5 3 2.5 5-6.5" />
    </>
  ),
  // Alati — klizači (podešavanja tajmera i rutina).
  tools: (
    <>
      <path d="M5 21v-6M5 11V3M12 21v-9M12 8V3M19 21v-4M19 13V3" />
      <path d="M2.6 15h4.8M9.6 12h4.8M16.6 17h4.8" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.6L2.4 20.4h19.2z" />
      <path d="M12 9.6v4.6M12 17.2v.1" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11v5.4M12 7.9v.1" />
    </>
  ),
  offline: (
    <>
      <path d="M3 3l18 18" />
      <path d="M8.6 15.4a4.8 4.8 0 016.8 0" />
      <path d="M5.2 11.6a9.6 9.6 0 014.1-2.4M18.8 11.6a9.6 9.6 0 00-3.3-2.2" />
      <path d="M1.9 7.9a14.4 14.4 0 015-3M22.1 7.9a14.4 14.4 0 00-8.6-3.4" />
      <path d="M12 19.3v.1" />
    </>
  ),
  note: (
    <>
      <path d="M5.2 2.8h9.4l5 5v13.4H5.2z" />
      <path d="M14.2 2.8v5.2h5" />
      <path d="M8.6 12.6h6.8M8.6 16.4h4.6" />
    </>
  ),
  flame: <path d="M12 21.5c3.6 0 6.2-2.4 6.2-5.8 0-3.9-3.1-5.4-3.1-8.9 0-1.4.5-2.6 1.1-3.3-3.6.6-6.6 3.4-6.6 6.9 0 1.5.5 2.4.5 3.2 0 1-.8 1.7-1.7 1.7-.9 0-1.6-.6-1.9-1.4-.4.9-.7 2-.7 3.1 0 3 2.6 4.5 6.2 4.5z" />,
  trophy: (
    <>
      <path d="M7.5 3.5h9v5.2a4.5 4.5 0 11-9 0z" />
      <path d="M7.5 5.2H4.8v1.6a3.2 3.2 0 003.2 3.2M16.5 5.2h2.7v1.6a3.2 3.2 0 01-3.2 3.2" />
      <path d="M12 13.2v3.9M8.6 20.5h6.8M9.8 20.5c0-1.9 1-3.4 2.2-3.4s2.2 1.5 2.2 3.4" />
    </>
  ),
  check: <path d="M4.5 12.6l4.7 4.7L19.5 7" />,
  timer: (
    <>
      <circle cx="12" cy="13.6" r="7.4" />
      <path d="M12 10v3.6l2.4 1.4" />
      <path d="M9.5 2.2h5" />
      <path d="M18.9 7.1l1.4-1.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7v5.2l3.2 1.9" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M3.4 12h17.2" />
      <path d="M12 3.2a13 13 0 010 17.6 13 13 0 010-17.6z" />
    </>
  ),
  moon: <path d="M20.5 14.4A8.8 8.8 0 019.6 3.5a8.8 8.8 0 1010.9 10.9z" />,
  mic: (
    <>
      <rect x="9" y="2.6" width="6" height="11.2" rx="3" />
      <path d="M5.4 11.4a6.6 6.6 0 0013.2 0" />
      <path d="M12 18v3.4M9 21.4h6" />
    </>
  ),
  pen: (
    <>
      <path d="M16.6 3.4l4 4L8.4 19.6l-5 1 1-5z" />
      <path d="M14.2 5.8l4 4" />
    </>
  ),
  bell: (
    <>
      <path d="M18.2 16.4V10a6.2 6.2 0 10-12.4 0v6.4L4 18.4h16z" />
      <path d="M10 21.4a2.3 2.3 0 004 0" />
    </>
  ),
  repeat: (
    <>
      <path d="M3.6 11.2A5.6 5.6 0 019.2 5.6h11.2" />
      <path d="M17.4 2.8l3 2.8-3 2.8" />
      <path d="M20.4 12.8a5.6 5.6 0 01-5.6 5.6H3.6" />
      <path d="M6.6 21.2l-3-2.8 3-2.8" />
    </>
  ),
  bulb: (
    <>
      <path d="M9.4 17.6a6.4 6.4 0 115.2 0" />
      <path d="M9.4 17.6v1.8a2.6 2.6 0 005.2 0v-1.8" />
      <path d="M10 20.9h4" />
    </>
  ),
  phone: (
    <>
      <rect x="6.4" y="2.4" width="11.2" height="19.2" rx="2.4" />
      <path d="M10.8 18.6h2.4" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M18.9 14.7a1.5 1.5 0 00.3 1.7l.1.1a1.9 1.9 0 01-2.7 2.7l-.1-.1a1.5 1.5 0 00-1.7-.3 1.5 1.5 0 00-.9 1.4v.2a1.9 1.9 0 01-3.8 0v-.1a1.5 1.5 0 00-1-1.4 1.5 1.5 0 00-1.7.3l-.1.1a1.9 1.9 0 01-2.7-2.7l.1-.1a1.5 1.5 0 00.3-1.7 1.5 1.5 0 00-1.4-.9h-.2a1.9 1.9 0 010-3.8h.1a1.5 1.5 0 001.4-1 1.5 1.5 0 00-.3-1.7l-.1-.1a1.9 1.9 0 012.7-2.7l.1.1a1.5 1.5 0 001.7.3h.1a1.5 1.5 0 00.9-1.4v-.2a1.9 1.9 0 013.8 0v.1a1.5 1.5 0 00.9 1.4 1.5 1.5 0 001.7-.3l.1-.1a1.9 1.9 0 012.7 2.7l-.1.1a1.5 1.5 0 00-.3 1.7v.1a1.5 1.5 0 001.4.9h.2a1.9 1.9 0 010 3.8h-.1a1.5 1.5 0 00-1.4.9z" />
    </>
  ),
}

export default function LineIcon({
  name, size = 18, strokeWidth = 1.6, className, style,
}: {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden
    >
      {PATHS[name]}
    </svg>
  )
}
