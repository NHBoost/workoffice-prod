// Exporte toutes les données seed en INSERT SQL prêts à exécuter dans Supabase SQL Editor.
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const p = new PrismaClient()

// Échappe une valeur pour SQL (gère null, string, date, number, boolean)
function esc(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return String(v)
  if (v instanceof Date) return `'${v.toISOString()}'`
  // String : échapper les apostrophes
  return `'${String(v).replace(/'/g, "''")}'`
}

function insertRow(table, row, columns) {
  const cols = columns.map(c => `"${c}"`).join(', ')
  const vals = columns.map(c => esc(row[c])).join(', ')
  return `INSERT INTO "${table}" (${cols}) VALUES (${vals});`
}

async function main() {
  const out = []
  out.push('-- Données seed WorkOffice')
  out.push('-- Générées automatiquement\n')

  // Centers
  const centers = await p.center.findMany({ orderBy: { createdAt: 'asc' } })
  out.push(`-- Centres (${centers.length})`)
  const centerCols = ['id', 'name', 'address', 'city', 'postalCode', 'country', 'phone', 'email', 'isActive', 'createdAt', 'updatedAt']
  centers.forEach(c => out.push(insertRow('centers', c, centerCols)))
  out.push('')

  // Users
  const users = await p.user.findMany({ orderBy: { createdAt: 'asc' } })
  out.push(`-- Utilisateurs (${users.length})`)
  const userCols = ['id', 'name', 'email', 'emailVerified', 'image', 'password', 'role', 'phone', 'isActive', 'centerId', 'permissions', 'createdAt', 'updatedAt']
  users.forEach(u => out.push(insertRow('users', u, userCols)))
  out.push('')

  // Enterprises
  const enterprises = await p.enterprise.findMany({ orderBy: { createdAt: 'asc' } })
  out.push(`-- Entreprises (${enterprises.length})`)
  const entCols = ['id', 'name', 'legalForm', 'siret', 'address', 'city', 'postalCode', 'country', 'phone', 'email', 'contactPerson', 'status', 'domiciliationDate', 'suspensionDate', 'terminationDate', 'centerId', 'createdAt', 'updatedAt']
  enterprises.forEach(e => out.push(insertRow('enterprises', e, entCols)))
  out.push('')

  // MeetingRooms
  const rooms = await p.meetingRoom.findMany({ orderBy: { createdAt: 'asc' } })
  out.push(`-- Salles de réunion (${rooms.length})`)
  const roomCols = ['id', 'name', 'description', 'capacity', 'equipment', 'hourlyRate', 'isActive', 'centerId', 'createdAt', 'updatedAt']
  rooms.forEach(r => out.push(insertRow('meeting_rooms', r, roomCols)))
  out.push('')

  // CoworkingSpaces
  const spaces = await p.coworkingSpace.findMany({ orderBy: { createdAt: 'asc' } })
  out.push(`-- Espaces coworking (${spaces.length})`)
  const spaceCols = ['id', 'name', 'description', 'totalSpots', 'dailyRate', 'monthlyRate', 'yearlyRate', 'amenities', 'isActive', 'centerId', 'createdAt', 'updatedAt']
  spaces.forEach(s => out.push(insertRow('coworking_spaces', s, spaceCols)))
  out.push('')

  // Invoices
  const invoices = await p.invoice.findMany({ orderBy: { createdAt: 'asc' } })
  if (invoices.length > 0) {
    out.push(`-- Factures (${invoices.length})`)
    const invCols = ['id', 'number', 'enterpriseId', 'subscriptionId', 'amount', 'taxAmount', 'totalAmount', 'dueDate', 'status', 'issuedAt', 'paidAt', 'createdAt', 'updatedAt']
    invoices.forEach(i => out.push(insertRow('invoices', i, invCols)))
    out.push('')
  }

  // Packages
  const packages = await p.package.findMany({ orderBy: { createdAt: 'asc' } })
  if (packages.length > 0) {
    out.push(`-- Colis (${packages.length})`)
    const pkgCols = ['id', 'tracking', 'recipient', 'sender', 'enterpriseId', 'centerId', 'status', 'receivedAt', 'collectedAt', 'notes', 'createdAt', 'updatedAt']
    packages.forEach(pk => out.push(insertRow('packages', pk, pkgCols)))
    out.push('')
  }

  // Mails
  const mails = await p.mail.findMany({ orderBy: { createdAt: 'asc' } })
  if (mails.length > 0) {
    out.push(`-- Courriers (${mails.length})`)
    const mailCols = ['id', 'recipient', 'sender', 'enterpriseId', 'centerId', 'status', 'receivedAt', 'collectedAt', 'notes', 'createdAt', 'updatedAt']
    mails.forEach(m => out.push(insertRow('mails', m, mailCols)))
    out.push('')
  }

  fs.writeFileSync('/tmp/seed.sql', out.join('\n'))
  console.log(`✅ Généré /tmp/seed.sql (${out.length} lignes)`)
  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
