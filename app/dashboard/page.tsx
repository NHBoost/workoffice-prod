import { Suspense } from 'react'
import { DashboardHeader } from './_components/DashboardHeader'
import { HeroKpis, HeroKpisSkeleton } from './_sections/HeroKpis'
import { CentersPerformance, CentersPerformanceSkeleton } from './_sections/CentersPerformance'
import { RevenueAndTop, RevenueAndTopSkeleton } from './_sections/RevenueAndTop'
import { Operations, OperationsSkeleton } from './_sections/Operations'

// Force dynamic rendering — données live, pas de cache statique au build
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Cockpit dashboard avec Suspense streaming :
 *
 *  • Le shell (header + skeletons) s'affiche immediatement
 *  • Chaque section fetch ses propres donnees en parallele cote serveur
 *  • React stream le HTML au fur et a mesure que chaque section resout
 *  • Resultat : LCP ≈ shell paint (instant), pas le temps de la query la plus lente
 */
export default function CockpitDashboard() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <DashboardHeader />

      <Suspense fallback={<HeroKpisSkeleton />}>
        <HeroKpis />
      </Suspense>

      <Suspense fallback={<CentersPerformanceSkeleton />}>
        <CentersPerformance />
      </Suspense>

      <Suspense fallback={<RevenueAndTopSkeleton />}>
        <RevenueAndTop />
      </Suspense>

      <Suspense fallback={<OperationsSkeleton />}>
        <Operations />
      </Suspense>
    </div>
  )
}
