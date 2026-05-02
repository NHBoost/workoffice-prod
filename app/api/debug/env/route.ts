import { NextResponse } from 'next/server'

/**
 * Endpoint de diagnostic env vars (sans exposer les valeurs).
 * À supprimer une fois le problème résolu.
 */
export async function GET() {
  const check = (key: string) => {
    const v = process.env[key]
    if (!v) return { ok: false, status: 'MISSING' }
    if (v.trim() !== v) return { ok: false, status: 'HAS_WHITESPACE', length: v.length }
    if (v === '') return { ok: false, status: 'EMPTY' }
    return { ok: true, length: v.length, preview: `${v.substring(0, 8)}…${v.substring(v.length - 4)}` }
  }

  return NextResponse.json({
    DATABASE_URL: check('DATABASE_URL'),
    DIRECT_URL: check('DIRECT_URL'),
    NEXTAUTH_SECRET: check('NEXTAUTH_SECRET'),
    NEXTAUTH_URL: check('NEXTAUTH_URL'),
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL ?? null,
    timestamp: new Date().toISOString(),
  })
}
