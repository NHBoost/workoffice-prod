import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

/**
 * Pages accessibles aux Admins uniquement.
 * Manager / User reçoivent un 403.
 */
const ADMIN_ONLY_ROUTES = [
  '/dashboard/centers',
  '/dashboard/users/add',
  '/api/centers',
]

/**
 * Pages accessibles aux Admins et Managers (pas aux User simples).
 */
const STAFF_ONLY_ROUTES = [
  '/dashboard/users',
  '/dashboard/entreprises',
  '/dashboard/facturation',
  '/dashboard/mailing',
  '/dashboard/kpis_personnel',
  '/api/users',
  '/api/enterprises',
  '/api/invoices',
  '/api/mailing',
]

function startsWithAny(path: string, prefixes: string[]) {
  return prefixes.some(p => path === p || path.startsWith(p + '/') || path.startsWith(p + '?'))
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = (req.nextauth?.token?.role as string) || 'USER'

    // Admin → tout
    if (role === 'ADMIN') return NextResponse.next()

    // Routes Admin uniquement
    if (startsWithAny(pathname, ADMIN_ONLY_ROUTES)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Routes staff (Admin + Manager)
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
    '/api/((?!auth|debug).*)',
  ],
}
