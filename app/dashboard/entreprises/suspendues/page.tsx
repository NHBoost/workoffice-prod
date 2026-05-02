import EnterpriseList from '@/components/EnterpriseList'

export default function SuspendedEnterprisesPage() {
  return (
    <EnterpriseList
      forcedStatus="suspended"
      title="Entreprises suspendues"
      description="Liste des entreprises actuellement suspendues"
    />
  )
}
