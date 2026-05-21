'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner, Card, EmptyState } from '@/components/ui'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import ClientForm from '@/components/ClientForm'

/**
 * Page d'edition d'un client : charge les donnees, formatte pour le form,
 * puis delegue a <ClientForm clientId={...} initialData={...} />.
 *
 * Les champs CI / Registre national restent vides → l'admin doit les
 * retaper pour les modifier (sinon ils conservent les valeurs chiffrees).
 */
export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [initialData, setInitialData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/clients/${params.id}`)
      .then(async r => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) {
          setError(body.error || 'Client introuvable')
          return
        }

        // Formate les dates ISO en YYYY-MM-DD pour les inputs type=date
        const toDateInput = (iso: string | null | undefined) =>
          iso ? new Date(iso).toISOString().slice(0, 10) : ''

        setInitialData({
          societeDenomination: body.societeDenomination ?? '',
          formeJuridique: body.formeJuridique ?? '',
          bce: body.bce ?? '',
          numeroTva: body.numeroTva ?? '',
          adresseSiege: body.adresseSiege ?? '',
          emailSociete: body.emailSociete ?? '',
          telephoneSociete: body.telephoneSociete ?? '',
          secteurActivite: body.secteurActivite ?? '',
          dateConstitution: toDateInput(body.dateConstitution),
          nom: body.nom ?? '',
          prenom: body.prenom ?? '',
          fonction: body.fonction ?? '',
          adressePersonnelle: body.adressePersonnelle ?? '',
          dateNaissance: toDateInput(body.dateNaissance),
          lieuNaissance: body.lieuNaissance ?? '',
          nationalite: body.nationalite ?? '',
          // CI / Registre national sont chiffres → on les laisse vides
          // (l'admin doit retaper pour modifier, sinon conserves)
          numeroCi: '',
          ciDebutValidite: toDateInput(body.ciDebutValidite),
          ciFinValidite: toDateInput(body.ciFinValidite),
          registreNational: '',
          emailPerso: body.emailPerso ?? '',
          telephonePerso: body.telephonePerso ?? '',
          centerId: body.centerId ?? '',
          formule: body.formule ?? '',
          dateDebut: toDateInput(body.dateDebut),
          dureeMois: body.dureeMois ?? 12,
          montantHt: body.montantHt ?? 0,
          tvaTaux: body.tvaTaux ?? 21,
        })
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-6">
          <EmptyState
            icon={AlertTriangle}
            title="Client introuvable"
            description={error}
          />
        </Card>
      </div>
    )
  }

  return <ClientForm clientId={params.id} initialData={initialData} />
}
