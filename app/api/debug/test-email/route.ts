import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'

/**
 * GET /api/debug/test-email?to=test@example.com
 *
 * Envoie un email test via Resend et retourne la reponse BRUTE de l'API.
 * Permet de voir exactement ce qui se passe (bounce, domaine non verifie,
 * cle invalide, etc.).
 *
 * Acces ADMIN + MANAGER.
 */
export async function GET(request: NextRequest) {
  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  const url = new URL(request.url)
  const to = url.searchParams.get('to') || session!.user.email
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev'
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY non defini' }, { status: 500 })
  }

  // Appel direct a Resend (pas via le wrapper, pour voir la reponse brute)
  const result = {
    sentFrom: from,
    sentTo: to,
    apiKeyPrefix: apiKey.slice(0, 8) + '...',
    timestamp: new Date().toISOString(),
    response: null as any,
    httpStatus: 0,
    success: false,
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: '🧪 Test Prestigia — ' + new Date().toLocaleTimeString('fr-FR'),
        html: `
          <h1>Test Prestigia OK ✅</h1>
          <p>Cet email confirme que la configuration Resend fonctionne.</p>
          <p>Envoye a : <strong>${to}</strong></p>
          <p>Depuis : <strong>${from}</strong></p>
          <p>Si tu reçois ceci, la chaine d'envoi est bonne. Le probleme est ailleurs.</p>
          <hr>
          <small>Timestamp : ${new Date().toISOString()}</small>
        `,
        text: `Test Prestigia OK\n\nEnvoye a : ${to}\nDepuis : ${from}\nTimestamp : ${new Date().toISOString()}`,
      }),
    })

    result.httpStatus = res.status
    result.response = await res.json().catch(() => ({ raw: 'non-JSON response' }))
    result.success = res.ok
  } catch (e: any) {
    result.response = { error: e.message, stack: e.stack }
  }

  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
