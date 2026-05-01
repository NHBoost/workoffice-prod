'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import CenterForm, { CenterFormData } from '@/components/CenterForm'

export default function EditCenterPage({ params }: { params: { id: string } }) {
  const [initial, setInitial] = useState<Partial<CenterFormData> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/centers/${params.id}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(c => {
        setInitial({
          name: c.name,
          address: c.address,
          city: c.city,
          postalCode: c.postalCode,
          country: c.country,
          phone: c.phone || '',
          email: c.email || '',
          isActive: c.isActive,
        })
      })
      .catch(() => setError('Centre introuvable'))
  }, [params.id])

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 bg-red-50 text-red-700">{error}</div>
      </div>
    )
  }

  if (!initial) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return <CenterForm initialData={initial} centerId={params.id} />
}
