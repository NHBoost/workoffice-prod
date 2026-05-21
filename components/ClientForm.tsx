'use client'

import { useEffect, useState, FormEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, Building2, User, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { FORMULES, FORMULE_LABELS, type Formule } from '@/lib/client-schemas'

interface CenterOption {
  id: string
  name: string
  city: string
}

interface ClientFormData {
  // Section A — Societe
  societeDenomination: string
  formeJuridique: string
  bce: string
  numeroTva: string
  adresseSiege: string
  emailSociete: string
  telephoneSociete: string
  secteurActivite: string
  dateConstitution: string

  // Section B — Personne physique
  nom: string
  prenom: string
  fonction: string
  adressePersonnelle: string
  dateNaissance: string
  lieuNaissance: string
  nationalite: string
  numeroCi: string
  ciDebutValidite: string
  ciFinValidite: string
  registreNational: string
  emailPerso: string
  telephonePerso: string

  // Section C — Domiciliation
  centerId: string
  formule: Formule | ''
  dateDebut: string
  dureeMois: number
  montantHt: number
  tvaTaux: number
}

const empty: ClientFormData = {
  societeDenomination: '', formeJuridique: 'SRL', bce: '', numeroTva: '',
  adresseSiege: '', emailSociete: '', telephoneSociete: '',
  secteurActivite: '', dateConstitution: '',
  nom: '', prenom: '', fonction: '', adressePersonnelle: '',
  dateNaissance: '', lieuNaissance: '', nationalite: 'Belge',
  numeroCi: '', ciDebutValidite: '', ciFinValidite: '',
  registreNational: '', emailPerso: '', telephonePerso: '',
  centerId: '', formule: '', dateDebut: '', dureeMois: 12,
  montantHt: 0, tvaTaux: 21,
}

export default function ClientForm() {
  const router = useRouter()
  const [data, setData] = useState<ClientFormData>(empty)
  const [centers, setCenters] = useState<CenterOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/centers')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => setCenters(d.centers || []))
      .catch(() => toast.error('Impossible de charger les centres'))
  }, [])

  const update = <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) =>
    setData(d => ({ ...d, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSubmitting(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.details) {
          const fieldErrors: Record<string, string> = {}
          for (const e of body.details) {
            if (e.path?.[0]) fieldErrors[e.path[0]] = e.message
          }
          setErrors(fieldErrors)
          toast.error('Vérifie les champs en rouge')
        } else {
          toast.error(body.error || 'Erreur lors de l\'enregistrement')
        }
        return
      }
      toast.success('Client créé avec succès')
      router.push('/dashboard/clients')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  // ============ helpers UI ============
  const Field = ({
    label, name, type = 'text', required = false, placeholder, hint,
    colSpan = 1, value, onChange,
  }: {
    label: string
    name: keyof ClientFormData
    type?: string
    required?: boolean
    placeholder?: string
    hint?: string
    colSpan?: 1 | 2 | 3
    value?: string | number
    onChange?: (v: string) => void
  }) => (
    <div className={colSpan === 2 ? 'sm:col-span-2' : colSpan === 3 ? 'sm:col-span-3' : ''}>
      <label className="block text-xs font-medium text-text-muted mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        type={type}
        value={value !== undefined ? value : (data[name] as any)}
        onChange={e => onChange ? onChange(e.target.value) : update(name, type === 'number' ? Number(e.target.value) as any : e.target.value as any)}
        placeholder={placeholder}
        required={required}
        className={`w-full px-3 py-2 text-sm rounded-lg border bg-surface text-text outline-none transition-colors focus:ring-2 focus:ring-gold-400/40 focus:border-gold-500 ${errors[name] ? 'border-danger' : 'border-border'}`}
      />
      {hint && !errors[name] && <p className="text-2xs text-text-subtle mt-1">{hint}</p>}
      {errors[name] && <p className="text-2xs text-danger mt-1">{errors[name]}</p>}
    </div>
  )

  const Section = ({ icon: Icon, title, subtitle, children }: {
    icon: any; title: string; subtitle: string; children: ReactNode
  }) => (
    <div className="card p-6">
      <div className="flex items-start gap-3 mb-5 pb-4 border-b border-border">
        <div className="h-10 w-10 rounded-lg bg-gold-50 text-gold-600 dark:bg-gold-900/30 dark:text-gold-400 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-md font-semibold tracking-tight text-text">{title}</h2>
          <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients" className="btn btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tighter text-text">Nouveau client</h1>
            <p className="text-sm text-text-muted">Encodage en 3 sections — données chiffrées pour les champs sensibles</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* === Section A — Société === */}
        <Section icon={Building2} title="Section A — Société"
          subtitle="Données de la personne morale (utilisées dans le contrat)">
          <Field label="Dénomination sociale" name="societeDenomination" required colSpan={2}
            placeholder="ex: ACME Consulting SRL" />
          <Field label="Forme juridique" name="formeJuridique" required
            placeholder="SRL, SA, SCS..." />
          <Field label="Numéro d'entreprise (BCE)" name="bce" required
            placeholder="0123.456.789" hint="10 chiffres" />
          <Field label="Numéro de TVA" name="numeroTva" required
            placeholder="BE0123.456.789" />
          <Field label="Adresse du siège social" name="adresseSiege" required colSpan={2}
            placeholder="Rue, n°, code postal, ville" />
          <Field label="E-mail société" name="emailSociete" type="email" required
            placeholder="contact@societe.com" />
          <Field label="Téléphone société" name="telephoneSociete" required
            placeholder="+32 2 123 45 67" />
          <Field label="Secteur d'activité" name="secteurActivite" required
            placeholder="Consultance, code NACE ou texte" />
          <Field label="Date de constitution" name="dateConstitution" type="date" required />
        </Section>

        {/* === Section B — Personne physique === */}
        <Section icon={User} title="Section B — Représentant légal"
          subtitle="Personne physique signataire (chiffré pour CI et registre national)">
          <Field label="Nom" name="nom" required placeholder="Dupont" />
          <Field label="Prénom" name="prenom" required placeholder="Jean" />
          <Field label="Fonction dans la société" name="fonction" required colSpan={2}
            placeholder="Gérant, Administrateur, CEO..." />
          <Field label="Adresse personnelle" name="adressePersonnelle" required colSpan={2}
            placeholder="Rue, n°, code postal, ville" />
          <Field label="Date de naissance" name="dateNaissance" type="date" required />
          <Field label="Lieu de naissance" name="lieuNaissance" required placeholder="Bruxelles" />
          <Field label="Nationalité" name="nationalite" required placeholder="Belge" />
          <Field label="Numéro de carte d'identité" name="numeroCi" required
            placeholder="123-1234567-12" hint="🔒 Chiffré à l'insertion" />
          <Field label="Validité CI — début" name="ciDebutValidite" type="date" required />
          <Field label="Validité CI — fin" name="ciFinValidite" type="date" required />
          <Field label="N° Registre national" name="registreNational" required colSpan={2}
            placeholder="80.01.01-123.45" hint="🔒 Chiffré à l'insertion" />
          <Field label="E-mail personnel (login portail)" name="emailPerso" type="email" required
            placeholder="jean.dupont@email.com" hint="Servira au login du portail client" />
          <Field label="Téléphone personnel" name="telephonePerso" required
            placeholder="+32 470 12 34 56" />
        </Section>

        {/* === Section C — Domiciliation === */}
        <Section icon={MapPin} title="Section C — Domiciliation & formule"
          subtitle="Centre de rattachement et conditions commerciales">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Centre de rattachement <span className="text-danger">*</span>
            </label>
            <select
              value={data.centerId}
              onChange={e => update('centerId', e.target.value)}
              required
              className={`w-full px-3 py-2 text-sm rounded-lg border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40 ${errors.centerId ? 'border-danger' : 'border-border'}`}
            >
              <option value="">— Sélectionner —</option>
              {centers.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
              ))}
            </select>
            {errors.centerId && <p className="text-2xs text-danger mt-1">{errors.centerId}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Formule <span className="text-danger">*</span>
            </label>
            <select
              value={data.formule}
              onChange={e => update('formule', e.target.value as Formule)}
              required
              className={`w-full px-3 py-2 text-sm rounded-lg border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40 ${errors.formule ? 'border-danger' : 'border-border'}`}
            >
              <option value="">— Sélectionner —</option>
              {FORMULES.map(f => (
                <option key={f} value={f}>{FORMULE_LABELS[f]}</option>
              ))}
            </select>
            {errors.formule && <p className="text-2xs text-danger mt-1">{errors.formule}</p>}
          </div>

          <Field label="Date de début du contrat" name="dateDebut" type="date" required />
          <Field label="Durée d'engagement (mois)" name="dureeMois" type="number" required
            hint="ex: 12 pour 1 an" />
          <Field label="Montant mensuel HT (€)" name="montantHt" type="number" required
            placeholder="0.00" />
          <Field label="TVA %" name="tvaTaux" type="number" required
            hint="21% par défaut en Belgique" />
        </Section>

        {/* === Actions === */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/dashboard/clients" className="btn btn-ghost">
            Annuler
          </Link>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? 'Enregistrement...' : 'Créer le client'}
          </button>
        </div>
      </form>
    </div>
  )
}
