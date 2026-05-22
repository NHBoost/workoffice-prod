import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

/**
 * Pages accessibles aux Admins uniquement.
 * Manager → redirige /dashboard, User → redirige /portail.
 */
const ADMIN_ONLY_ROUTES = [
  '/dashboard/centers',
  '/dashboard/users/add',
  '/api/centers',
]

/**
 * Pages accessibles aux Admins et Managers (pas aux User simples).
 * User → redirige /portail.
 */
const STAFF_ONLY_ROUTES = [
  '/dashboard/users',
  '/dashboard/clients',
  '/dashboard/entreprises',
  '/dashboard/facturation',
  '/dashboard/mailing',
  '/dashboard/kpis_personnel',
  '/api/users',
  '/api/clients',
  '/api/enterprises',
  '/api/invoices',
  '/api/mailing',
]

/**
 * Routes du portail client (USER only). Les ADMIN/MANAGER sont redirigés
 * vers /dashboard (pour éviter la confusion).
 */
const PORTAIL_ROUTES_PREFIX = '/portail'

function startsWithAny(path: string, prefixes: string[]) {
  return prefixes.some(p => path === p || path.startsWith(p + '/') || path.startsWith(p + '?'))
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = (req.nextauth?.token?.role as string) || 'USER'

    // ============ Cloisonnement strict par rôle ============
    // USER → ne peut JAMAIS acceder au dashboard admin.
    // Toute tentative /dashboard/* redirige vers /portail.
    if (role === 'USER' && pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/portail', req.url))
    }
    // USER ne peut acceder aux APIs admin (sauf /api/portail/* et /api/me)
    if (
      role === 'USER' &&
      pathname.startsWith('/api/') &&
      !pathname.startsWith('/api/portail/') &&
      !pathname.startsWith('/api/me') &&
      !pathname.startsWith('/api/auth/')
    ) {
      return NextResponse.json({ error: 'Forbidden — portail client only' }, { status: 403 })
    }

    // ADMIN / MANAGER → ne peuvent pas acceder au portail client
    // (UI uniquement, les API portail sont protegees par requirePortailClient)
    if (role !== 'USER' && pathname.startsWith(PORTAIL_ROUTES_PREFIX)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // ============ Cloisonnement fin pour ADMIN / MANAGER ============
    // Admin → tout autorisé sur /dashboard et /api admin
    if (role === 'ADMIN') return NextResponse.next()

    // Routes Admin uniquement (MANAGER bloqué ici)
    if (startsWithAny(pathname, ADMIN_ONLY_ROUTES)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Routes staff (Admin + Manager) → USER deja bloque plus haut
    if (startsWithAny(pathname, STAFF_ONLY_ROUTES) && role !== 'MANAGER') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden — staff only' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Refus si pas de token (utilisateur non connecté)
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/portail/:path*',
    '/api/((?!auth|debug).*)',
  ],
}
