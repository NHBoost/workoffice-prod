import EnterpriseList from '@/components/EnterpriseList'

export default function TerminatedEnterprisesPage() {
  return (
    <EnterpriseList
      forcedStatus="terminated"
      title="Entreprises résiliées"
      description="Historique des entreprises ayant rompu leur domiciliation"
    />
  )
}
