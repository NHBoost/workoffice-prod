'use client'

import { useEffect, useState, FormEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, Building2, User, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  FORMULES, FORMULE_LABELS, PERIODICITES, PERIODICITE_LABELS,
  PRICING, getPriceFor, type Formule, type Periodicite,
} from '@/lib/client-schemas'

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
  periodicite: Periodicite
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
  centerId: '', formule: '', periodicite: 'MENSUEL',
  dateDebut: '', dureeMois: 12, montantHt: 0, tvaTaux: 21,
}

// ============================================================
// Composants extraits HORS du parent — sinon recreation a chaque
// render -> remount des inputs -> perte de focus apres 1 frappe.
// ============================================================

interface FieldProps {
  label: string
  name: keyof ClientFormData
  type?: string
  required?: boolean
  placeholder?: string
  hint?: string
  colSpan?: 1 | 2 | 3
  value: string | number
  error?: string
  onChange: (value: string | number) => void
}

function Field({
  label, name, type = 'text', required, placeholder, hint,
  colSpan = 1, value, error, onChange,
}: FieldProps) {
  return (
    <div className={colSpan === 2 ? 'sm:col-span-2' : colSpan === 3 ? 'sm:col-span-3' : ''}>
      <label className="block text-xs font-medium text-text-muted mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full px-3 py-2 text-sm rounded-lg border bg-surface text-text outline-none transition-colors focus:ring-2 focus:ring-gold-400/40 focus:border-gold-500 ${error ? 'border-danger' : 'border-border'}`}
      />
      {hint && !error && <p className="text-2xs text-text-subtle mt-1">{hint}</p>}
      {error && <p className="text-2xs text-danger mt-1">{error}</p>}
    </div>
  )
}

interface SectionProps {
  icon: any
  title: string
  subtitle: string
  children: ReactNode
}

function Section({ icon: Icon, title, subtitle, children }: SectionProps) {
  return (
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
}

// ============================================================
// Composant principal
// ============================================================

interface ClientFormProps {
  /** Mode edition : si fourni, le formulaire est pré-rempli et POST → PATCH /api/clients/[id] */
  clientId?: string
  /** Donnees initiales pour le mode edition */
  initialData?: Partial<ClientFormData>
}

export default function ClientForm({ clientId, initialData }: ClientFormProps = {}) {
  const router = useRouter()
  const isEdit = !!clientId
  const [data, setData] = useState<ClientFormData>({ ...empty, ...initialData })
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
      // Mode edition : on n'envoie pas les champs sensibles s'ils sont vides
      // (l'admin a laisse le placeholder pour conserver la valeur existante)
      let body: any = { ...data }
      if (isEdit) {
        if (!data.numeroCi || data.numeroCi.trim() === '') delete body.numeroCi
        if (!data.registreNational || data.registreNational.trim() === '') delete body.registreNational
      }

      const url = isEdit ? `/api/clients/${clientId}` : '/api/clients'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        if (errBody.details) {
          const fieldErrors: Record<string, string> = {}
          for (const e of errBody.details) {
            if (e.path?.[0]) fieldErrors[e.path[0]] = e.message
          }
          setErrors(fieldErrors)
          toast.error('Vérifie les champs en rouge')
        } else {
          toast.error(errBody.error || 'Erreur lors de l\'enregistrement')
        }
        return
      }
      toast.success(isEdit ? 'Client mis à jour' : 'Client créé avec succès')
      router.push(isEdit ? `/dashboard/clients/${clientId}` : '/dashboard/clients')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  // Wrapper pratique pour passer les bonnes props a chaque <Field>
  const field = (
    label: string,
    name: keyof ClientFormData,
    extra: {
      type?: string
      required?: boolean
      placeholder?: string
      hint?: string
      colSpan?: 1 | 2 | 3
    } = {}
  ) => (
    <Field
      label={label}
      name={name}
      value={data[name] as any}
      error={errors[name]}
      onChange={v => update(name, v as any)}
      {...extra}
    />
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={isEdit ? `/dashboard/clients/${clientId}` : '/dashboard/clients'} className="btn btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tighter text-text">
              {isEdit ? 'Modifier le client' : 'Nouveau client'}
            </h1>
            <p className="text-sm text-text-muted">
              {isEdit
                ? 'Modifie les champs nécessaires — laisse vide les champs CI/Registre national pour conserver les valeurs actuelles'
                : 'Encodage en 3 sections — données chiffrées pour les champs sensibles'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* === Section A — Société === */}
        <Section icon={Building2} title="Section A — Société"
          subtitle="Données de la personne morale (utilisées dans le contrat)">
          {field('Dénomination sociale', 'societeDenomination', { required: true, colSpan: 2, placeholder: 'ex: ACME Consulting SRL' })}
          {field('Forme juridique', 'formeJuridique', { required: true, placeholder: 'SRL, SA, SCS...' })}
          {field("Numéro d'entreprise (BCE)", 'bce', { required: true, placeholder: '0123.456.789', hint: '10 chiffres' })}
          {field('Numéro de TVA', 'numeroTva', { required: true, placeholder: 'BE0123.456.789' })}
          {field('Adresse du siège social', 'adresseSiege', { required: true, colSpan: 2, placeholder: 'Rue, n°, code postal, ville' })}
          {field('E-mail société', 'emailSociete', { type: 'email', required: true, placeholder: 'contact@societe.com' })}
          {field('Téléphone société', 'telephoneSociete', { required: true, placeholder: '+32 2 123 45 67' })}
          {field("Secteur d'activité", 'secteurActivite', { required: true, placeholder: 'Consultance, code NACE ou texte' })}
          {field('Date de constitution', 'dateConstitution', { type: 'date', required: true })}
        </Section>

        {/* === Section B — Personne physique === */}
        <Section icon={User} title="Section B — Représentant légal"
          subtitle="Personne physique signataire (chiffré pour CI et registre national)">
          {field('Nom', 'nom', { required: true, placeholder: 'Dupont' })}
          {field('Prénom', 'prenom', { required: true, placeholder: 'Jean' })}
          {field('Fonction dans la société', 'fonction', { required: true, colSpan: 2, placeholder: 'Gérant, Administrateur, CEO...' })}
          {field('Adresse personnelle', 'adressePersonnelle', { required: true, colSpan: 2, placeholder: 'Rue, n°, code postal, ville' })}
          {field('Date de naissance', 'dateNaissance', { type: 'date', required: true })}
          {field('Lieu de naissance', 'lieuNaissance', { required: true, placeholder: 'Bruxelles' })}
          {field('Nationalité', 'nationalite', { required: true, placeholder: 'Belge' })}
          {field("Numéro de carte d'identité", 'numeroCi', {
            required: !isEdit,
            placeholder: isEdit ? 'Laisse vide pour conserver la valeur actuelle' : '123-1234567-12',
            hint: isEdit ? '🔒 Valeur existante chiffrée — tape une nouvelle valeur pour la modifier' : "🔒 Chiffré à l'insertion"
          })}
          {field('Validité CI — début', 'ciDebutValidite', { type: 'date', required: true })}
          {field('Validité CI — fin', 'ciFinValidite', { type: 'date', required: true })}
          {field('N° Registre national', 'registreNational', {
            required: !isEdit,
            colSpan: 2,
            placeholder: isEdit ? 'Laisse vide pour conserver la valeur actuelle' : '80.01.01-123.45',
            hint: isEdit ? '🔒 Valeur existante chiffrée — tape une nouvelle valeur pour la modifier' : "🔒 Chiffré à l'insertion"
          })}
          {field('E-mail personnel (login portail)', 'emailPerso', { type: 'email', required: true, placeholder: 'jean.dupont@email.com', hint: 'Servira au login du portail client' })}
          {field('Téléphone personnel', 'telephonePerso', { required: true, placeholder: '+32 470 12 34 56' })}
        </Section>

        {/* === Section C — Domiciliation === */}
        <Section icon={MapPin} title="Section C — Domiciliation & formule"
          subtitle="Centre de rattachement, formule officielle Prestigia et périodicité de facturation">
          {/* Centre */}
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

          {/* Date début */}
          {field('Date de début du contrat', 'dateDebut', { type: 'date', required: true })}

          {/* Formule */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Formule officielle Prestigia <span className="text-danger">*</span>
            </label>
            <select
              value={data.formule}
              onChange={e => {
                const f = e.target.value as Formule | ''
                update('formule', f)
                // Auto-fill du montant si la formule a un tarif officiel
                if (f && data.periodicite) {
                  const price = getPriceFor(f, data.periodicite)
                  if (price > 0) update('montantHt', price)
                }
              }}
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

          {/* Periodicite — 3 boutons radio stylés */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Périodicité de facturation <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PERIODICITES.map(p => {
                const price = data.formule ? PRICING[data.formule as Formule]?.[p] : null
                const isSelected = data.periodicite === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      update('periodicite', p)
                      if (data.formule) {
                        const newPrice = getPriceFor(data.formule as Formule, p)
                        if (newPrice > 0) update('montantHt', newPrice)
                      }
                    }}
                    className={`px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      isSelected
                        ? 'border-gold-500 bg-gold-50 text-gold-700 ring-2 ring-gold-400/40 dark:bg-gold-900/20 dark:text-gold-400'
                        : 'border-border bg-surface text-text hover:border-gold-300 hover:bg-surface-2'
                    }`}
                  >
                    <div className="font-medium">{PERIODICITE_LABELS[p]}</div>
                    {price !== null && price !== undefined ? (
                      <div className="text-2xs mt-0.5 nums-tabular opacity-75">{price} € HTVA</div>
                    ) : data.formule === 'PACK_SS_UE' ? (
                      <div className="text-2xs mt-0.5 opacity-60 italic">À définir</div>
                    ) : null}
                  </button>
                )
              })}
            </div>
            {errors.periodicite && <p className="text-2xs text-danger mt-1">{errors.periodicite}</p>}
          </div>

          {/* Montant HT (auto-rempli mais éditable) */}
          {field('Montant HT total (€)', 'montantHt', {
            type: 'number',
            required: true,
            placeholder: '0.00',
            hint: data.formule === 'PACK_SS_UE'
              ? '💎 Pack — tarif préférentiel à définir manuellement'
              : data.formule
                ? `Tarif officiel ${PERIODICITE_LABELS[data.periodicite as Periodicite]?.toLowerCase()} : ${getPriceFor(data.formule as Formule, data.periodicite as Periodicite) || '—'} € HTVA`
                : "Sélectionne d'abord une formule pour auto-remplir"
          })}

          {/* Durée engagement */}
          {field("Durée d'engagement (mois)", 'dureeMois', { type: 'number', required: true, hint: 'ex: 12 pour 1 an' })}

          {/* TVA */}
          {field('TVA %', 'tvaTaux', { type: 'number', required: true, hint: '21% par défaut en Belgique' })}
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
