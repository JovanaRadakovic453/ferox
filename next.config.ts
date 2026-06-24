import type { NextConfig } from "next";

// Bezbednosni zaglavlja za sve rute. Vercel NE dodaje ova podrazumevano.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    // TODO: nonce-based CSP (zahteva nonce plumbing za Tailwind v4 / framer-motion inline stilove)
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
