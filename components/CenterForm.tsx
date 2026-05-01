'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export interface CenterFormData {
  name: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  email: string
  isActive: boolean
}

interface Props {
  initialData?: Partial<CenterFormData>
  centerId?: string // si fourni → mode édition
}

const empty: CenterFormData = {
  name: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'Belgique',
  phone: '',
  email: '',
  isActive: true,
}

export default function CenterForm({ initialData, centerId }: Props) {
  const router = useRouter()
  const [data, setData] = useState<CenterFormData>({ ...empty, ...initialData })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = !!centerId

  const update = <K extends keyof CenterFormData>(key: K, value: CenterFormData[K]) =>
    setData(d => ({ ...d, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSubmitting(true)

    try {
      const url = isEdit ? `/api/centers/${centerId}` : '/api/centers'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
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
        }
        toast.error(body.error || 'Erreur lors de l’enregistrement')
        return
      }

      toast.success(isEdit ? 'Centre mis à jour' : 'Centre créé')
      router.push('/dashboard/centers')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  const Field = ({
    label,
    name,
    type = 'text',
    required = false,
    placeholder,
  }: {
    label: string
    name: keyof CenterFormData
    type?: string
    required?: boolean
    placeholder?: string
  }) => (
    <div>
      <label className="form-label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={(data[name] as string) || ''}
        onChange={e => update(name, e.target.value as any)}
        required={required}
        placeholder={placeholder}
        className={`form-input ${errors[name] ? 'border-red-500' : ''}`}
      />
      {errors[name] && <p className="text-xs text-red-600 mt-1">{errors[name]}</p>}
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/centers"
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Modifier le centre' : 'Nouveau centre'}
          </h1>
          <p className="text-gray-600">
            {isEdit
              ? 'Modifiez les informations du centre'
              : 'Créez un nouveau centre de coworking'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Identification</h2>
          <Field label="Nom du centre" name="name" required placeholder="Bruxelles Centre" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Adresse</h2>
          <div className="space-y-4">
            <Field label="Adresse" name="address" required placeholder="Rue de la Loi 16" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Code postal" name="postalCode" required placeholder="1000" />
              <Field label="Ville" name="city" required placeholder="Bruxelles" />
              <Field label="Pays" name="country" required placeholder="Belgique" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Téléphone" name="phone" placeholder="+32 2 123 45 67" />
            <Field label="Email" name="email" type="email" placeholder="contact@center.be" />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={data.isActive}
            onChange={e => update('isActive', e.target.checked)}
            className="h-4 w-4 text-primary-600 rounded border-gray-300"
          />
          <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
            Centre actif
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href="/dashboard/centers" className="btn-secondary">
            Annuler
          </Link>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Enregistrer' : 'Créer le centre'}
          </button>
        </div>
      </form>
    </div>
  )
}
