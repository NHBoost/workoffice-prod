import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if user is authenticated
        if (!token) return false

        // Allow access to dashboard and API routes for authenticated users
        if (req.nextUrl.pathname.startsWith('/dashboard')) {
          return true
        }

        if (req.nextUrl.pathname.startsWith('/api') && !req.nextUrl.pathname.startsWith('/api/auth')) {
          return true
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*'
  ]
}