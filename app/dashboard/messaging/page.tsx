'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  Send,
  Inbox,
  Plus,
  Search,
  Loader2,
  Mail,
  Trash2,
  Circle,
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
  status: 'READ' | 'UNREAD' | string
  readAt: string | null
  createdAt: string
  sender: UserMini
  receiver: UserMini
}

export default function MessagingPage() {
  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox')
  const [messages, setMessages] = useState<Message[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const fetchMessages = () => {
    const params = new URLSearchParams({ folder })
    if (search) params.set('search', search)
    setLoading(true)
    fetch(`/api/messages?${params.toString()}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(d => {
        setMessages(d.messages || [])
        setUnreadCount(d.unreadCount || 0)
        setError(null)
      })
      .catch(() => setError('Erreur lors du chargement des messages'))
      .finally(() => setLoading(false))
  }

  useEffect(fetchMessages, [folder, search])

  const handleDelete = async (m: Message) => {
    if (!confirm(`Supprimer le message "${m.subject}" ?`)) return
    setActingId(m.id)
    try {
      const res = await fetch(`/api/messages/${m.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success('Message supprimé')
      fetchMessages()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActingId(null)
    }
  }

  const initials = (u: UserMini) =>
    (u.name || u.email).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Messagerie
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-primary-600 text-white text-sm rounded-full">
                {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p className="text-gray-600">Communiquez avec les autres utilisateurs de la plateforme</p>
        </div>
        <Link href="/dashboard/messaging/nouveau" className="btn-primary">
          <Plus className="h-5 w-5" />
          Nouveau message
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar folders */}
        <div className="lg:col-span-1 space-y-2">
          <button
            onClick={() => setFolder('inbox')}
            className={`w-full flex items-center justify-between p-3 rounded-lg transition ${
              folder === 'inbox'
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Boîte de réception
            </span>
            {unreadCount > 0 && folder !== 'inbox' && (
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFolder('sent')}
            className={`w-full flex items-center gap-2 p-3 rounded-lg transition ${
              folder === 'sent'
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <Send className="h-5 w-5" />
            Envoyés
          </button>
        </div>

        {/* Liste messages */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher dans les messages..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 form-input"
              />
            </div>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : error ? (
              <div className="p-6 bg-red-50 text-red-700">{error}</div>
            ) : messages.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Aucun message {folder === 'inbox' ? 'dans la boîte de réception' : 'envoyé'}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {messages.map(m => {
                  const interlocutor = folder === 'inbox' ? m.sender : m.receiver
                  const isUnread = folder === 'inbox' && m.status === 'UNREAD'
                  return (
                    <li key={m.id} className={`hover:bg-gray-50 ${isUnread ? 'bg-blue-50/30' : ''}`}>
                      <div className="flex items-center justify-between p-4 gap-3">
                        <Link
                          href={`/dashboard/messaging/${m.id}`}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                              isUnread ? 'bg-primary-600' : 'bg-gray-400'
                            }`}
                          >
                            {initials(interlocutor)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {interlocutor.name || interlocutor.email}
                              </p>
                              {isUnread && <Circle className="h-2 w-2 fill-primary-600 text-primary-600 shrink-0" />}
                            </div>
                            <p className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                              {m.subject}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{m.content}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-500">
                              {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </Link>
                        <button
                          onClick={() => handleDelete(m)}
                          disabled={actingId === m.id}
                          className="p-2 text-red-400 hover:text-red-600 rounded hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
