'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Reply,
  Calendar,
  CheckCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface UserMini {
  id: string
  name: string | null
  email: string
}

interface Message {
  id: string
  subject: string
  content: string
  status: string
  readAt: string | null
  createdAt: string
  sender: UserMini
  receiver: UserMini
}

export default function MessageDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [message, setMessage] = useState<Message | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    fetch(`/api/messages/${params.id}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(setMessage)
      .catch(() => setError('Message introuvable'))
  }, [params.id])

  const markUnread = async () => {
    setActing(true)
    try {
      const res = await fetch(`/api/messages/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'UNREAD' }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success('Marqué comme non lu')
      router.push('/dashboard/messaging')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer ce message ?')) return
    setActing(true)
    try {
      const res = await fetch(`/api/messages/${params.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success('Message supprimé')
      router.push('/dashboard/messaging')
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
  if (!message) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const initials = (u: UserMini) =>
    (u.name || u.email).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

  const replyParams = new URLSearchParams({
    replyTo: message.sender.id,
    subject: message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/messaging" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Message</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/messaging/nouveau?${replyParams.toString()}`}
            className="btn-primary"
          >
            <Reply className="h-4 w-4" />
            Répondre
          </Link>
          <button onClick={markUnread} disabled={acting} className="btn-secondary">
            Marquer non lu
          </button>
          <button onClick={handleDelete} disabled={acting} className="btn-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{message.subject}</h2>
          {message.status === 'READ' && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Lu {message.readAt && `le ${new Date(message.readAt).toLocaleDateString('fr-FR')}`}
            </span>
          )}
        </div>

        <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
          <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium">
            {initials(message.sender)}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {message.sender.name || message.sender.email}
                </p>
                <p className="text-sm text-gray-500">{message.sender.email}</p>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(message.createdAt).toLocaleString('fr-FR')}
              </p>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              <span className="font-medium">À : </span>
              {message.receiver.name || message.receiver.email}{' '}
              <span className="text-gray-400">&lt;{message.receiver.email}&gt;</span>
            </p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
          {message.content}
        </div>
      </div>
    </div>
  )
}
