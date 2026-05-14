'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Send,
  Trash2,
  Mail,
  Eye,
  MousePointer,
  Users,
  Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { sanitizeEmailHTML } from '@/lib/sanitize'

interface Recipient {
  id: string
  email: string
  name: string | null
  sentAt: string | null
  openedAt: string | null
  clickedAt: string | null
}

interface Campaign {
  id: string
  name: string
  subject: string
  content: string
  status: string
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
  recipients: Recipient[]
  stats: { total: number; sent: number; opened: number; clicked: number }
}

const statusLabel = (s: string) =>
  ({ DRAFT: 'Brouillon', SCHEDULED: 'Programmée', SENT: 'Envoyée', CANCELLED: 'Annulée' }[s] || s)
const statusColor = (s: string) =>
  ({
    DRAFT: 'bg-gray-100 text-gray-700',
    SCHEDULED: 'bg-blue-100 text-blue-800',
    SENT: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }[s] || 'bg-gray-100 text-gray-700')

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100))

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  const fetchCampaign = () => {
    fetch(`/api/mailing/${params.id}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(setCampaign)
      .catch(() => setError('Campagne introuvable'))
  }
  useEffect(fetchCampaign, [params.id])

  const sendNow = async () => {
    if (!confirm('Envoyer la campagne maintenant ?')) return
    setActing(true)
    try {
      const res = await fetch(`/api/mailing/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success('Campagne envoyée')
      fetchCampaign()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Supprimer la campagne "${campaign?.name}" ?`)) return
    setActing(true)
    try {
      const res = await fetch(`/api/mailing/${params.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success('Campagne supprimée')
      router.push('/dashboard/mailing')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActing(false)
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 bg-red-50 text-red-700">{error}</div>
      </div>
    )
  }
  if (!campaign) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const { stats } = campaign

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/mailing" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              {campaign.name}
              <span className={`status-badge ${statusColor(campaign.status)}`}>
                {statusLabel(campaign.status)}
              </span>
            </h1>
            <p className="text-gray-600 italic">"{campaign.subject}"</p>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'DRAFT' && (
            <button onClick={sendNow} disabled={acting} className="btn-primary">
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer maintenant
            </button>
          )}
          <button onClick={handleDelete} disabled={acting} className="btn-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Destinataires</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Envoyés</p>
              <p className="text-2xl font-bold">{stats.sent}</p>
              <p className="text-xs text-gray-500">{pct(stats.sent, stats.total)} %</p>
            </div>
            <Send className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ouvertures</p>
              <p className="text-2xl font-bold">{stats.opened}</p>
              <p className="text-xs text-green-600">{pct(stats.opened, stats.sent)} % taux</p>
            </div>
            <Eye className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clics</p>
              <p className="text-2xl font-bold">{stats.clicked}</p>
              <p className="text-xs text-orange-600">{pct(stats.clicked, stats.sent)} % taux</p>
            </div>
            <MousePointer className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary-600" />
          Contenu de l’email
        </h2>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Sujet : {campaign.subject}</p>
          <div
            className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700"
            dangerouslySetInnerHTML={{ __html: sanitizeEmailHTML(campaign.content) }}
          />
        </div>
        {campaign.sentAt && (
          <p className="mt-4 text-sm text-gray-500 flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Envoyée le {new Date(campaign.sentAt).toLocaleString('fr-FR')}
          </p>
        )}
      </div>

      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Destinataires</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Email</th>
                <th className="table-header">Nom</th>
                <th className="table-header">Envoyé</th>
                <th className="table-header">Ouvert</th>
                <th className="table-header">Cliqué</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaign.recipients.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Aucun destinataire.</td></tr>
              )}
              {campaign.recipients.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-cell text-sm">{r.email}</td>
                  <td className="table-cell text-sm">{r.name || '—'}</td>
                  <td className="table-cell text-sm">
                    {r.sentAt ? (
                      <span className="text-green-600">{new Date(r.sentAt).toLocaleDateString('fr-FR')}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="table-cell text-sm">
                    {r.openedAt ? (
                      <span className="text-green-600">{new Date(r.openedAt).toLocaleDateString('fr-FR')}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="table-cell text-sm">
                    {r.clickedAt ? (
                      <span className="text-orange-600">{new Date(r.clickedAt).toLocaleDateString('fr-FR')}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
