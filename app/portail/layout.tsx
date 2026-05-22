import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PortailNav } from './_components/PortailNav'

/**
 * Layout du portail client.
 * - Accessible uniquement aux USER (les ADMIN/MANAGER sont redirigés au dashboard).
 * - Layout minimaliste : header + nav 3 onglets + main.
 */
export default async function PortailLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  // Pas connecté → login
  if (!session?.user) {
    redirect('/auth/login')
  }

  // Mauvais rôle → dashboard admin (anti-confusion)
  if (session.user.role !== 'USER') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-bg">
      <PortailNav userName={session.user.name ?? session.user.email ?? ''} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
