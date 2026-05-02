'use client'

import { useSession } from 'next-auth/react'
import {
  User as UserIcon, Mail, Phone, Shield, MapPin, Calendar, Sparkles,
} from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Avatar, RoleBadge, Badge,
  Spinner,
} from '@/components/ui'

export default function ProfilePage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="p-6">
        <Spinner size="lg" />
      </div>
    )
  }

  const user = session?.user as any
  if (!user) {
    return (
      <div className="p-6">
        <Card className="p-6"><p>Aucune session active.</p></Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-4xl">
      <PageHeader
        title="Mon profil"
        description="Vos informations personnelles et préférences de compte."
      />

      {/* Card hero avec avatar */}
      <Card variant="default" className="overflow-hidden">
        {/* Banner gradient */}
        <div className="h-24 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(201,162,39,0.5) 0, transparent 50%)',
          }} />
        </div>

        <div className="px-6 pb-6 -mt-10 relative">
          <div className="flex items-end justify-between gap-4 mb-4">
            <Avatar name={user.name} email={user.email} size="xl" className="ring-4 ring-bg" status="online" />
            <RoleBadge role={user.role} size="md" />
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-text">
              {user.name || 'Utilisateur'}
            </h2>
            <p className="text-sm text-text-muted mt-0.5">{user.email}</p>
          </div>
        </div>
      </Card>

      {/* Détails du compte */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-md flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-electric-600" />
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-5">
            <Row icon={Mail} label="Email" value={user.email} />
            <Row icon={Shield} label="Rôle" value={
              <RoleBadge role={user.role} />
            } />
            <Row icon={Sparkles} label="ID utilisateur" value={
              <span className="font-mono text-2xs text-text-subtle">{user.id}</span>
            } />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-md flex items-center gap-2">
              <MapPin className="h-4 w-4 text-electric-600" />
              Affectation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-5">
            <Row icon={MapPin} label="Centre" value={
              user.centerId ? (
                <Badge tone="info" size="sm">{user.centerId.substring(0, 12)}…</Badge>
              ) : <span className="text-text-subtle">Aucun centre affecté</span>
            } />
            <Row icon={Calendar} label="Statut" value={
              <Badge tone="success" size="sm" dot>Actif</Badge>
            } />
          </CardContent>
        </Card>
      </div>

      {/* Note */}
      <Card className="p-5 bg-electric-50/40 border-electric-200/40 dark:bg-electric-900/10 dark:border-electric-700/30">
        <p className="text-sm text-text-muted">
          💡 <strong className="text-text">Astuce :</strong> Pour modifier votre nom, mot de passe ou téléphone,
          rendez-vous dans la section <strong>Paramètres</strong> (réservée aux administrateurs)
          ou contactez votre manager.
        </p>
      </Card>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 shrink-0 rounded-lg bg-surface-2 inline-flex items-center justify-center text-text-muted mt-0.5">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xs text-text-subtle uppercase tracking-wider">{label}</p>
        <div className="text-sm text-text mt-0.5 break-all">{value}</div>
      </div>
    </div>
  )
}
