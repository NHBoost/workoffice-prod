'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, Paperclip, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { directUpload } from '@/lib/direct-upload'

const TYPE_OPTIONS = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'RECOMMANDE', label: 'Recommandé' },
  { value: 'COLIS', label: 'Colis' },
  { value: 'OFFICIEL', label: 'Officiel' },
]

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

// Un payeur (Enterprise ou Client) uniformisé pour le dropdown
interface Payeur { id: string; label: string; kind: 'enterprise' | 'client' }

export default function NewMailPage() {
  const router = useRouter()
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([])
  const [payeurs, setPayeurs] = useState<Payeur[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [recipient, setRecipient] = useState('')
  const [sender, setSender] = useState('')
  const [centerId, setCenterId] = useState('')
  // payeurSelect = "kind:id" (ex: "client:abc123") ou "" pour aucun
  const [payeurSelect, setPayeurSelect] = useState('')
  const [type, setType] = useState('STANDARD')
  const [notes, setNotes] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [notifyClient, setNotifyClient] = useState(true)

  useEffect(() => {
    // Fetch centres + entreprises + clients en parallele.
    // Les clients sont maintenant la source principale (Etape 1 du CDC),
    // mais on garde les entreprises pour la retrocompatibilite.
    // Chargements independants (un echec n'empeche pas les autres) et sans
    // cache navigateur (sinon un centre supprime peut rester proposé).
    const get = (url: string, fallback: any) =>
      fetch(url, { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : fallback))
        .catch(() => fallback)
    Promise.all([
      get('/api/centers', { centers: [] }),
      get('/api/enterprises?limit=200', { enterprises: [] }),
      get('/api/clients?limit=200', { clients: [] }),
    ]).then(([c, e, cl]) => {
      const cs = (c.centers || []).map((x: any) => ({ id: x.id, name: x.name }))
      const clients: Payeur[] = (cl.clients || []).map((x: any) => ({
        id: x.id,
        label: `${x.societeDenomination} (${x.prenom} ${x.nom})`,
        kind: 'client' as const,
      }))
      const enterprises: Payeur[] = (e.enterprises || []).map((x: any) => ({
        id: x.id,
        label: x.name,
        kind: 'enterprise' as const,
      }))
      setCenters(cs)
      // Clients en premier (nouveau) + entreprises apres (legacy)
      setPayeurs([...clients, ...enterprises])
      if (cs.length) setCenterId(cs[0].id)
      else toast.error('Aucun centre disponible pour votre compte')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!centerId) {
      toast.error('Sélectionnez un centre')
      return
    }
    // Limite de taille d'une requete sur Vercel (~4,5 Mo)
    if (docFile && docFile.size > MAX_UPLOAD_BYTES) {
      toast.error('Fichier trop volumineux (max 20 Mo)')
      return
    }
    setSubmitting(true)
    try {
      // 1. Upload direct du document vers Supabase (pas de limite Vercel)
      let documentPath: string | undefined
      if (docFile) {
        try {
          documentPath = await directUpload(docFile, { purpose: 'mail', centerId })
        } catch (err: any) {
          toast.error(err.message || 'Upload du document échoué')
          return
        }
      }

      // 2. Creation du courrier (JSON, avec le chemin du document)
      const body: Record<string, any> = {
        recipient,
        centerId,
        type,
        status: 'RECEIVED',
        notifyClient,
        documentPath,
      }
      if (sender) body.sender = sender
      if (notes) body.notes = notes
      if (payeurSelect) {
        const [kind, id] = payeurSelect.split(':')
        if (kind === 'client') body.clientId = id
        else if (kind === 'enterprise') body.enterpriseId = id
      }

      const res = await fetch('/api/mails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        const msg =
          d.details?.[0]?.message ? `${d.error} : ${d.details[0].message}`
          : d.error || `Erreur lors de l’enregistrement (${res.status})`
        toast.error(msg)
        return
      }
      const created = await res.json().catch(() => ({}))
      toast.success(
        (docFile ? 'Courrier enregistré avec document' : 'Courrier enregistré') +
        (created.emailSent ? ' — client notifié par email' : '')
      )
      router.push('/dashboard/courriers')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/courriers" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enregistrer un courrier</h1>
          <p className="text-gray-600">Réception d’un nouveau courrier pour une entreprise domiciliée</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Destinataire <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                required
                placeholder="Nom et prénom du destinataire"
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Expéditeur</label>
              <input
                type="text"
                value={sender}
                onChange={e => setSender(e.target.value)}
                placeholder="Ex: La Poste, BNP Paribas..."
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Centre <span className="text-red-500">*</span></label>
              <select
                value={centerId}
                onChange={e => setCenterId(e.target.value)}
                required
                className="form-input"
              >
                <option value="">Sélectionner un centre</option>
                {centers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Client / Entreprise concerné(e)</label>
              <select
                value={payeurSelect}
                onChange={e => setPayeurSelect(e.target.value)}
                className="form-input"
              >
                <option value="">— Aucun (courrier personnel) —</option>
                {payeurs.filter(p => p.kind === 'client').length > 0 && (
                  <optgroup label="Clients">
                    {payeurs.filter(p => p.kind === 'client').map(p => (
                      <option key={`client:${p.id}`} value={`client:${p.id}`}>{p.label}</option>
                    ))}
                  </optgroup>
                )}
                {payeurs.filter(p => p.kind === 'enterprise').length > 0 && (
                  <optgroup label="Entreprises (legacy)">
                    {payeurs.filter(p => p.kind === 'enterprise').map(p => (
                      <option key={`ent:${p.id}`} value={`enterprise:${p.id}`}>{p.label}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            {payeurSelect.startsWith('client:') && (
              <label className="sm:col-span-2 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={notifyClient}
                  onChange={e => setNotifyClient(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Notifier le client par email (courrier visible sur son portail)
              </label>
            )}
            <div>
              <label className="form-label">Type de courrier</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="form-input"
              >
                {TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Recommandé, urgent, lettre simple..."
                className="form-input"
              />
            </div>

            {/* Champ upload document */}
            <div className="sm:col-span-2">
              <label className="form-label">
                Document (scan du courrier)
                <span className="text-gray-400 font-normal"> — optionnel</span>
              </label>
              {docFile ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gold-200 bg-gold-50/50 dark:bg-gold-900/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-4 w-4 text-gold-600 shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{docFile.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {(docFile.size / 1024).toFixed(0)} ko
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocFile(null)}
                    className="p-1 hover:bg-gray-200 rounded text-gray-500 shrink-0"
                    title="Retirer le fichier"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-2 border-dashed border-gray-300 hover:border-gold-400 hover:bg-gold-50/30 cursor-pointer transition-colors">
                  <Paperclip className="h-6 w-6 text-gray-400" />
                  <span className="text-sm text-gray-600">Cliquer pour ajouter un document</span>
                  <span className="text-xs text-gray-400">PDF, Word (DOC/DOCX), Excel, JPG, PNG — max 20 Mo</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,image/webp"
                    onChange={e => setDocFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href="/dashboard/courriers" className="btn-secondary">Annuler</Link>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  )
}
