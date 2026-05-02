'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Building,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  Trash2,
  Pause,
  XCircle,
  Play,
  Save,
  FileText,
  Package,
  Inbox,
  Wallet,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Enterprise {
  id: string
  name: string
  legalForm: string | null
  siret: string | null
  address: string
  city: string
  postalCode: string
  country: string
  phone: string | null
  email: string | null
  contactPerson: string | null
  status: string
  domiciliationDate: string | null
  suspensionDate: string | null
  terminationDate: string | null
  centerId: string
  center: { id: string; name: string }
  _count: { subscriptions: number; invoices: number; packages: number; mails: number }
}

const statusLabel = (s: string) =>
  ({ ACTIVE: 'Actif', SUSPENDED: 'Suspendu', TERMINATED: 'Résilié' }[s] || s)
const statusColor = (s: string) =>
  ({
    ACTIVE: 'bg-green-100 text-green-800',
    SUSPENDED: 'bg-yellow-100 text-yellow-800',
    TERMINATED: 'bg-red-100 text-red-800',
  }[s] || 'bg-gray-100 text-gray-700')

export default function EnterpriseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Enterprise>>({})

  const fetchEnterprise = () => {
    fetch(`/api/enterprises/${params.id}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(d => {
        setEnterprise(d)
        setForm(d)
      })
      .catch(() => setError('Entreprise introuvable'))
  }
  useEffect(fetchEnterprise, [params.id])

  const updateStatus = async (status: string) => {
    setActing(true)
    try {
      const res = await fetch(`/api/enterprises/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success(`Statut : ${statusLabel(status)}`)
      fetchEnterprise()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActing(false)
    }
  }

  const saveEdits = async () => {
    setActing(true)
    try {
      const res = await fetch(`/api/enterprises/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          legalForm: form.legalForm,
          siret: form.siret,
          address: form.address,
          city: form.city,
          postalCode: form.postalCode,
          country: form.country,
          phone: form.phone,
          email: form.email,
          contactPerson: form.contactPerson,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success('Entreprise mise à jour')
      setEditing(false)
      fetchEnterprise()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Supprimer définitivement "${enterprise?.name}" ?`)) return
    setActing(true)
    try {
      const res = await fetch(`/api/enterprises/${params.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success('Entreprise supprimée')
      router.push('/dashboard/entreprises')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActing(false)
    }
  }

  if (error) {
    return <div className="p-6"><div className="card p-6 bg-red-50 text-red-700">{error}</div></div>
  }
  if (!enterprise) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
  }

  const Field = ({ label, value, name }: { label: string; value: any; name: keyof Enterprise }) => (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      {editing ? (
        <input
          type="text"
          value={(form[name] as any) || ''}
          onChange={e => setForm({ ...form, [name]: e.target.value })}
          className="form-input mt-1"
        />
      ) : (
        <p className="text-gray-900 mt-1">{value || '—'}</p>
      )}
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/entreprises" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Building className="h-7 w-7 text-primary-600" />
              {enterprise.name}
              <span className={`status-badge ${statusColor(enterprise.status)}`}>
                {statusLabel(enterprise.status)}
              </span>
            </h1>
            <p className="text-gray-600">
              Centre : {enterprise.center.name}
              {enterprise.domiciliationDate &&
                ` • Domiciliée le ${new Date(enterprise.domiciliationDate).toLocaleDateString('fr-FR')}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-secondary">
              Modifier
            </button>
          )}
          {editing && (
            <>
              <button onClick={() => { setEditing(false); setForm(enterprise); }} className="btn-secondary">
                Annuler
              </button>
              <button onClick={saveEdits} disabled={acting} className="btn-primary">
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Abonnements</p>
              <p className="text-2xl font-bold">{enterprise._count.subscriptions}</p>
            </div>
            <Wallet className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Factures</p>
              <p className="text-2xl font-bold">{enterprise._count.invoices}</p>
            </div>
            <FileText className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Colis</p>
              <p className="text-2xl font-bold">{enterprise._count.packages}</p>
            </div>
            <Package className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Courriers</p>
              <p className="text-2xl font-bold">{enterprise._count.mails}</p>
            </div>
            <Inbox className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building className="h-5 w-5 text-primary-600" />
            Informations légales
          </h2>
          <div className="space-y-3">
            <Field label="Raison sociale" value={enterprise.name} name="name" />
            <Field label="Forme juridique" value={enterprise.legalForm} name="legalForm" />
            <Field label="SIRET / Numéro TVA" value={enterprise.siret} name="siret" />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary-600" />
            Contact
          </h2>
          <div className="space-y-3">
            <Field label="Personne contact" value={enterprise.contactPerson} name="contactPerson" />
            <Field label="Email" value={enterprise.email} name="email" />
            <Field label="Téléphone" value={enterprise.phone} name="phone" />
          </div>
        </div>

        <div className="card p-6 md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            Adresse
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2"><Field label="Adresse" value={enterprise.address} name="address" /></div>
            <Field label="Code postal" value={enterprise.postalCode} name="postalCode" />
            <Field label="Ville" value={enterprise.city} name="city" />
            <Field label="Pays" value={enterprise.country} name="country" />
          </div>
        </div>

        {(enterprise.suspensionDate || enterprise.terminationDate) && (
          <div className="card p-6 md:col-span-2 bg-yellow-50">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-yellow-600" />
              Historique du statut
            </h2>
            <div className="text-sm space-y-1 text-gray-700">
              {enterprise.suspensionDate && (
                <p>⏸️ Suspendue le {new Date(enterprise.suspensionDate).toLocaleDateString('fr-FR')}</p>
              )}
              {enterprise.terminationDate && (
                <p>🚫 Résiliée le {new Date(enterprise.terminationDate).toLocaleDateString('fr-FR')}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions de statut */}
      {!editing && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-2">
            {enterprise.status !== 'ACTIVE' && (
              <button onClick={() => updateStatus('ACTIVE')} disabled={acting} className="btn-primary">
                <Play className="h-4 w-4" />
                Réactiver
              </button>
            )}
            {enterprise.status === 'ACTIVE' && (
              <>
                <button onClick={() => updateStatus('SUSPENDED')} disabled={acting} className="btn-secondary">
                  <Pause className="h-4 w-4" />
                  Suspendre
                </button>
                <button onClick={() => updateStatus('TERMINATED')} disabled={acting} className="btn-secondary">
                  <XCircle className="h-4 w-4" />
                  Résilier
                </button>
              </>
            )}
            {enterprise.status === 'SUSPENDED' && (
              <button onClick={() => updateStatus('TERMINATED')} disabled={acting} className="btn-secondary">
                <XCircle className="h-4 w-4" />
                Résilier
              </button>
            )}
            <button onClick={handleDelete} disabled={acting} className="btn-danger ml-auto">
              <Trash2 className="h-4 w-4" />
              Supprimer définitivement
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
