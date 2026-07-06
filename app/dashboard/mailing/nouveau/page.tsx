'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, Plus, X, Users, Send } from 'lucide-react'
import toast from 'react-hot-toast'

interface Enterprise {
  id: string
  name: string
  email: string | null
  contactPerson: string | null
}
interface Client {
  id: string
  societeDenomination: string
  nom: string
  prenom: string
  emailPerso: string
  emailSociete: string
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [clients, setClients] = useState<Client[]>([])

  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [recipients, setRecipients] = useState<{ email: string; name?: string }[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/enterprises?limit=200').then(r => r.ok ? r.json() : { enterprises: [] }).catch(() => ({ enterprises: [] })),
      fetch('/api/clients?limit=200').then(r => r.ok ? r.json() : { clients: [] }).catch(() => ({ clients: [] })),
    ]).then(([e, cl]) => {
      setEnterprises(e.enterprises || [])
      setClients(cl.clients || [])
    }).catch(() => toast.error('Impossible de charger la liste des destinataires'))
  }, [])

  const addRecipient = () => {
    if (!newEmail.includes('@')) {
      toast.error('Email invalide')
      return
    }
    if (recipients.some(r => r.email === newEmail)) {
      toast.error('Email déjà ajouté')
      return
    }
    setRecipients([...recipients, { email: newEmail, name: newName || undefined }])
    setNewEmail('')
    setNewName('')
  }

  const removeRecipient = (email: string) =>
    setRecipients(recipients.filter(r => r.email !== email))

  const importAll = (source: 'enterprises' | 'clients' | 'all') => {
    const list: { email: string; name?: string }[] = []
    if (source === 'enterprises' || source === 'all') {
      for (const e of enterprises) {
        if (e.email) list.push({ email: e.email, name: e.contactPerson || e.name })
      }
    }
    if (source === 'clients' || source === 'all') {
      for (const c of clients) {
        // Email personnel du representant legal (utilise pour le portail)
        if (c.emailPerso) {
          list.push({
            email: c.emailPerso,
            name: `${c.prenom} ${c.nom} — ${c.societeDenomination}`,
          })
        }
      }
    }
    const merged = [...recipients]
    let added = 0
    for (const v of list) {
      if (!merged.some(m => m.email === v.email)) {
        merged.push(v)
        added++
      }
    }
    setRecipients(merged)
    toast.success(`${added} destinataire(s) importé(s)`)
  }

  const handleSubmit = async (e: FormEvent, status: 'DRAFT' | 'SCHEDULED' | 'SENT' = 'DRAFT') => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/mailing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subject,
          content,
          status,
          scheduledAt: status === 'SCHEDULED' && scheduledAt ? scheduledAt : undefined,
          targetType: 'CUSTOM',
          recipients,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      const created = await res.json()

      // Si envoi immédiat demandé, déclencher le send
      if (status === 'SENT') {
        await fetch(`/api/mailing/${created.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SENT' }),
        })
      }

      toast.success(
        status === 'SENT' ? 'Campagne envoyée' : status === 'SCHEDULED' ? 'Campagne programmée' : 'Brouillon enregistré'
      )
      router.push('/dashboard/mailing')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/mailing" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle campagne</h1>
          <p className="text-gray-600">Créez et envoyez une nouvelle campagne email</p>
        </div>
      </div>

      <form onSubmit={e => handleSubmit(e, 'DRAFT')} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Contenu de l’email</h2>
          <div>
            <label className="form-label">Nom de la campagne <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Ex: Newsletter Janvier 2026"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Sujet de l’email <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
              placeholder="Ex: Découvrez nos offres de janvier"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Contenu <span className="text-red-500">*</span></label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              rows={8}
              placeholder="Bonjour,&#10;&#10;Nous sommes heureux de vous présenter..."
              className="form-input font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">HTML accepté</p>
          </div>
          <div>
            <label className="form-label">Programmer l’envoi (optionnel)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Destinataires <span className="text-sm font-normal text-gray-500">({recipients.length})</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => importAll('clients')}
                className="btn-secondary text-sm"
                disabled={clients.length === 0}
                title={clients.length === 0 ? 'Aucun client disponible' : `${clients.length} clients disponibles`}
              >
                <Users className="h-4 w-4" />
                Importer les clients ({clients.length})
              </button>
              <button
                type="button"
                onClick={() => importAll('enterprises')}
                className="btn-secondary text-sm"
                disabled={enterprises.length === 0}
              >
                <Users className="h-4 w-4" />
                Importer les entreprises ({enterprises.length})
              </button>
              <button
                type="button"
                onClick={() => importAll('all')}
                className="btn-secondary text-sm"
              >
                <Users className="h-4 w-4" />
                Importer TOUT
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="email@example.com"
              className="form-input"
            />
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nom (optionnel)"
              className="form-input"
            />
            <button
              type="button"
              onClick={addRecipient}
              className="btn-secondary"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {recipients.length === 0 && (
              <p className="p-4 text-sm text-gray-500 text-center">Aucun destinataire ajouté</p>
            )}
            {recipients.map(r => (
              <div key={r.email} className="flex items-center justify-between p-3 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.email}</p>
                  {r.name && <p className="text-xs text-gray-500">{r.name}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeRecipient(r.email)}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href="/dashboard/mailing" className="btn-secondary">Annuler</Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn-secondary"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer brouillon
          </button>
          {scheduledAt && (
            <button
              type="button"
              onClick={e => handleSubmit(e as any, 'SCHEDULED')}
              disabled={submitting}
              className="btn-secondary"
            >
              Programmer
            </button>
          )}
          <button
            type="button"
            onClick={e => handleSubmit(e as any, 'SENT')}
            disabled={submitting || recipients.length === 0}
            className="btn-primary"
          >
            <Send className="h-4 w-4" />
            Envoyer maintenant
          </button>
        </div>
      </form>
    </div>
  )
}
