import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
  let hasSession = false

  // Try-catch défensif sur la lecture de session uniquement.
  // Si NextAuth/Prisma crash (ex: var d'env cassée, BDD KO), on
  // redirige proprement vers login au lieu de planter la page.
  try {
    const session = await getServerSession(authOptions)
    hasSession = !!session
  } catch {
    hasSession = false
  }

  if (hasSession) {
    redirect('/dashboard')
  }
  redirect('/auth/login')
}
