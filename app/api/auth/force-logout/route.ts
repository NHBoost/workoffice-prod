import { NextResponse } from 'next/server'

/**
 * Force logout : supprime manuellement tous les cookies NextAuth
 * et redirige vers /auth/login.
 *
 * Utile en fallback si signOut() de next-auth/react ne marche pas
 * (variable NEXTAUTH_URL mal configurée, etc.).
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const callbackUrl = url.searchParams.get('callbackUrl') || '/auth/login'

  const response = NextResponse.redirect(new URL(callbackUrl, request.url))

  // Liste de tous les cookies NextAuth possibles (selon environnement secure ou non)
  const cookieNames = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url',
    'next-auth.pkce.code_verifier',
  ]

  for (const name of cookieNames) {
    response.cookies.set({
      name,
      value: '',
      expires: new Date(0),
      path: '/',
    })
  }

  return response
}
