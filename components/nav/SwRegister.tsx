'use client'

import { useEffect } from 'react'

// Registers the service worker once the page has loaded (PWA install + offline).
export default function SwRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const register = () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) }
    if (document.readyState === 'complete') register()
    else { window.addEventListener('load', register, { once: true }); return () => window.removeEventListener('load', register) }
  }, [])
  return null
}
