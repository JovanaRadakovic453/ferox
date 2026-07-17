import { BrowserI18nProvider } from '@/components/i18n/I18nProvider'

// Ekrani pre prijave (prijava/registracija/reset) — jezik iz pregledača,
// jer korisnik još nema profil sa izabranim jezikom.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <BrowserI18nProvider>{children}</BrowserI18nProvider>
}
