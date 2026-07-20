// Uključivanje jutarnjeg podsetnika (push notifikacija).
//
// Izdvojeno da se logika ne prepisuje po ekranima. Podešavanja i dalje imaju svoju
// varijantu jer razlikuju „korisnik odbio dozvolu" od „nije uspelo" i za svaki
// slučaj prikazuju drugu poruku; ovde je dovoljno uspelo/nije.
//
// KAD se ovo zove je važnije od toga KAKO: dozvola za notifikacije tražena pre
// nego što korisnik vidi ikakvu korist redovno se odbija, a odbijena dozvola se
// vraća samo ručno kroz podešavanja pregledača. Zato se ne traži u onboardingu
// nego tek kad korisnik prvi put završi dan.

/** Uključi jutarnji podsetnik. `false` = korisnik odbio ili nije uspelo. */
export async function enableMorningReminder(): Promise<boolean> {
  try {
    if (typeof Notification === 'undefined' || typeof navigator === 'undefined') return false

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })

    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    })
    return res.ok
  } catch {
    return false
  }
}
