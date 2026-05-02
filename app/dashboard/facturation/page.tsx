'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus, Download, Eye, CheckCircle, Receipt, Euro, Clock, AlertTriangle,
  Trash2, ExternalLink,
} from 'lucide-react'
import {
  PageHeader, KpiCard, StatGrid, DataTable, ActionMenu, FilterBar, Pagination,
  ConfirmDialog, Button, Select, StatusBadge,
} from '@/components/ui'
import type { Column } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  number: string
  amount: number
  taxAmount: number
  totalAmount: number
  dueDate: string
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | string
  issuedAt: string
  paidAt: string | null
  enterprise: { id: string; name: string }
}

const PAGE_SIZE = 12

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [sumTotal, setSumTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Invoice | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchInvoices = () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    setLoading(true)
    fetch(`/api/invoices?${params.toString()}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(data => {
        setInvoices(data.invoices || [])
        setSumTotal(data.sumTotal || 0)
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(fetchInvoices, [searchTerm, statusFilter])
  useEffect(() => setPage(1), [searchTerm, statusFilter])

  const markAsPaid = async (inv: Invoice) => {
    setUpdatingId(inv.id)
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Facture ${inv.number} marquée payée`)
      fetchInvoices()
    } catch {
      toast.error('Erreur')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/invoices/${confirmDelete.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Facture supprimée')
      setConfirmDelete(null)
      fetchInvoices()
    } catch {
      toast.error('Erreur')
    } finally {
      setDeleting(false)
    }
  }

  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.totalAmount, 0)
  const totalPending = invoices.filter(i => i.status === 'PENDING').reduce((s, i) => s + i.totalAmount, 0)
  const totalOverdue = invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + i.totalAmount, 0)

  // Pagination locale
  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE))
  const pagedInvoices = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<Invoice>[] = useMemo(() => [
    {
      key: 'number',
      header: 'Numéro',
      sortable: true,
      render: i => <span className="font-mono text-xs font-medium text-text">{i.number}</span>,
    },
    {
      key: 'enterprise',
      header: 'Client',
      sortable: true,
      sortValue: i => i.enterprise.name,
      render: i => <span className="font-medium">{i.enterprise.name}</span>,
    },
    {
      key: 'amount',
      header: 'HT',
      sortable: true,
      align: 'right',
      render: i => <span className="text-text-muted nums-tabular">{i.amount.toFixed(2)} €</span>,
    },
    {
      key: 'taxAmount',
      header: 'TVA',
      align: 'right',
      render: i => <span className="text-text-subtle text-xs nums-tabular">{i.taxAmount.toFixed(2)} €</span>,
    },
    {
      key: 'totalAmount',
      header: 'TTC',
      sortable: true,
      align: 'right',
      render: i => <span className="font-semibold text-text nums-tabular">{formatCurrency(i.totalAmount)}</span>,
    },
    {
      key: 'dueDate',
      header: 'Échéance',
      sortable: true,
      sortValue: i => new Date(i.dueDate).getTime(),
      render: i => {
        const isOverdue = i.status === 'PENDING' && new Date(i.dueDate) < new Date()
        return (
          <span className={`text-xs nums-tabular ${isOverdue ? 'text-danger font-medium' : 'text-text-muted'}`}>
            {new Date(i.dueDate).toLocaleDateString('fr-FR')}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      render: i => <StatusBadge status={i.status} />,
    },
    {
      key: '_actions',
      header: '',
      width: '60px',
      align: 'right',
      render: inv => (
        <ActionMenu
          items={[
            { label: 'Voir détails', icon: Eye, href: `/dashboard/facturation/${inv.id}` },
            ...(inv.status !== 'PAID' && inv.status !== 'CANCELLED'
              ? [{ label: 'Marquer payée', icon: CheckCircle, onClick: () => markAsPaid(inv) }]
              : []),
            'divider',
            { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setConfirmDelete(inv) },
          ]}
        />
      ),
    },
  ], [])

  const chips = []
  if (statusFilter !== 'all') {
    chips.push({
      label: { pending: 'En attente', paid: 'Payées', overdue: 'En retard', cancelled: 'Annulées' }[statusFilter] || statusFilter,
      value: 'status',
      onRemove: () => setStatusFilter('all'),
    })
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <PageHeader
        title="Facturation"
        description="Gérez vos factures et le suivi des paiements"
        actions={
          <>
            <Button variant="secondary" iconLeft={<Download className="h-4 w-4" />}>
              Exporter
            </Button>
            <Link href="/dashboard/facturation/nouveau">
              <Button iconLeft={<Plus className="h-4 w-4" />}>Nouvelle facture</Button>
            </Link>
          </>
        }
      />

      <StatGrid cols={4}>
        <KpiCard
          label="Total facturé"
          value={formatCurrency(sumTotal)}
          icon={Receipt}
          tone="electric"
          loading={loading && invoices.length === 0}
        />
        <KpiCard
          label="Encaissé"
          value={formatCurrency(totalPaid)}
          sublabel={`${sumTotal > 0 ? Math.round((totalPaid / sumTotal) * 100) : 0}% du total`}
          icon={CheckCircle}
          tone="success"
          loading={loading && invoices.length === 0}
        />
        <KpiCard
          label="En attente"
          value={formatCurrency(totalPending)}
          icon={Clock}
          tone="warning"
          loading={loading && invoices.length === 0}
        />
        <KpiCard
          label="En retard"
          value={formatCurrency(totalOverdue)}
          icon={AlertTriangle}
          tone="danger"
          loading={loading && invoices.length === 0}
        />
      </StatGrid>

      <FilterBar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par numéro ou client..."
        chips={chips}
        filters={
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="!h-9 w-auto min-w-[140px]">
            <option value="all">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="paid">Payées</option>
            <option value="overdue">En retard</option>
            <option value="cancelled">Annulées</option>
          </Select>
        }
      />

      <DataTable
        columns={columns}
        data={pagedInvoices}
        loading={loading}
        loadingRows={6}
        emptyTitle="Aucune facture"
        emptyDescription="Commence par créer ta première facture pour suivre les paiements."
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        total={invoices.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Supprimer la facture ${confirmDelete?.number} ?`}
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        tone="danger"
        loading={deleting}
      />
    </div>
  )
}
