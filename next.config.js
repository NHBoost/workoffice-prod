/** @type {import('next').NextConfig} */

/**
 * Content Security Policy : whitelist stricte des sources autorisees.
 *
 * - default-src 'self'           → tout par defaut depuis le meme domaine
 * - script-src                   → 'unsafe-inline' + 'unsafe-eval' requis par Next.js
 *                                  ('unsafe-eval' uniquement en dev, mais Next 14 en a besoin
 *                                  en prod aussi sur certaines pages avec Server Actions)
 * - style-src                    → 'unsafe-inline' requis pour Tailwind/JIT
 * - img-src                      → self + data: + https: (avatars, unsplash, supabase)
 * - font-src                     → self + data: pour les @font-face inlinees
 * - connect-src                  → self + supabase + vercel pour les fetch
 * - frame-ancestors 'none'       → BLOQUE l'embed en iframe (anti-clickjacking)
 * - form-action 'self'           → les forms ne peuvent submit qu'au meme domaine
 * - upgrade-insecure-requests    → force HTTPS pour toutes les sous-resources
 */
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  // CSP : controle fine de toutes les sources de contenu
  {
    key: 'Content-Security-Policy',
    value: cspDirectives,
  },
  // HSTS : force HTTPS sur 2 ans, sous-domaines inclus, preload OK
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Bloque l'embed en iframe (double protection avec CSP frame-ancestors)
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Empeche le browser de deviner le MIME type (anti MIME-sniffing)
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Limite les infos envoyees dans Referer aux autres origins
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Desactive les APIs sensibles du navigateur par defaut
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Anti-XSS legacy (modernes ignorent mais ne fait pas de mal)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
]

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
