'use client'

import { useEffect, useRef, useState } from 'react'

/** Smoothly animates an integer toward `value` (eased) — for the done counter. */
export function useCountUp(value: number, duration = 550) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current
    const to = value
    if (from === to) return
    let raf = 0
    let start = 0
    const stepFn = (now: number) => {
      if (!start) start = now
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) raf = requestAnimationFrame(stepFn)
      else prev.current = to
    }
    raf = requestAnimationFrame(stepFn)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return display
}

export default useCountUp
