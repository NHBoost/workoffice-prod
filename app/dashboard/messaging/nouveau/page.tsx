'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import toast from 'react-hot-toast'

interface User {
  id: string
  name: string | null
  email: string
}

export default function NewMessagePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const replyTo = searchParams.get('replyTo')
  const initialSubject = searchParams.get('subject') || ''

  const [users, setUsers] = useState<User[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [receiverId, setReceiverId] = useState(replyTo || '')
  const [subject, setSubject] = useState(initialSubject)
  const [content, setContent] = useState('')

  useEffect(() => {
    fetch('/api/users?limit=200')
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(d => setUsers(d.users || []))
      .catch(() => toast.error('Impossible de charger les utilisateurs'))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId, subject, content }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success('Message envoyé')
      router.push('/dashboard/messaging')
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
        <Link href="/dashboard/messaging" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau message</h1>
          <p className="text-gray-600">Envoyer un message à un utilisateur de la plateforme</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="form-label">Destinataire <span className="text-red-500">*</span></label>
          <select
            value={receiverId}
            onChange={e => setReceiverId(e.target.value)}
            required
            className="form-input"
          >
            <option value="">Sélectionner un utilisateur</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name || u.email} ({u.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Sujet <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            required
            placeholder="Sujet du message"
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Message <span className="text-red-500">*</span></label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            required
            rows={10}
            placeholder="Écrivez votre message..."
            className="form-input"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href="/dashboard/messaging" className="btn-secondary">Annuler</Link>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer
          </button>
        </div>
      </form>
    </div>
  )
}
