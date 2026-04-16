import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Create Centers
  const bruxellesCenter = await prisma.center.create({
    data: {
      name: 'Bruxelles Centre',
      address: 'Rue de la Loi 123',
      city: 'Bruxelles',
      postalCode: '1000',
      country: 'Belgique',
      phone: '+32 2 123 45 67',
      email: 'bruxelles@workoffice.be',
    },
  })

  const liegeCenter = await prisma.center.create({
    data: {
      name: 'Liège',
      address: 'Place Saint-Lambert 456',
      city: 'Liège',
      postalCode: '4000',
      country: 'Belgique',
      phone: '+32 4 123 45 67',
      email: 'liege@workoffice.be',
    },
  })

  const anversCenter = await prisma.center.create({
    data: {
      name: 'Anvers',
      address: 'Grote Markt 789',
      city: 'Anvers',
      postalCode: '2000',
      country: 'Belgique',
      phone: '+32 3 123 45 67',
      email: 'anvers@workoffice.be',
    },
  })

  // Create Admin User
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.create({
    data: {
      name: 'David Admin',
      email: 'admin@workoffice.be',
      password: adminPassword,
      role: 'ADMIN',
      phone: '+32 2 987 65 43',
      centerId: bruxellesCenter.id,
      isActive: true,
    },
  })

  // Create Manager User
  const managerPassword = await hash('manager123', 12)
  const manager = await prisma.user.create({
    data: {
      name: 'Marie Manager',
      email: 'manager@workoffice.be',
      password: managerPassword,
      role: 'MANAGER',
      phone: '+32 4 987 65 43',
      centerId: liegeCenter.id,
      isActive: true,
    },
  })

  // Create Enterprises
  const enterprise1 = await prisma.enterprise.create({
    data: {
      name: 'GULFGUARD',
      legalForm: 'SA',
      siret: 'BE0123456789',
      address: 'Avenue Louise 456',
      city: 'Bruxelles',
      postalCode: '1050',
      country: 'Belgique',
      phone: '+32 2 456 78 90',
      email: 'contact@gulfguard.be',
      contactPerson: 'Jean Dupont',
      status: 'ACTIVE',
      domiciliationDate: new Date('2024-01-01'),
      centerId: bruxellesCenter.id,
    },
  })

  const enterprise2 = await prisma.enterprise.create({
    data: {
      name: 'BEACOON',
      legalForm: 'SRL',
      siret: 'BE0987654321',
      address: 'Chaussée de Charleroi 789',
      city: 'Bruxelles',
      postalCode: '1060',
      country: 'Belgique',
      phone: '+32 2 789 01 23',
      email: 'info@beacoon.be',
      contactPerson: 'Philippe Defraine',
      status: 'ACTIVE',
      domiciliationDate: new Date('2024-01-15'),
      centerId: bruxellesCenter.id,
    },
  })

  const enterprise3 = await prisma.enterprise.create({
    data: {
      name: 'TECH SOLUTIONS',
      legalForm: 'SPRL',
      address: 'Rue de l\'Innovation 321',
      city: 'Liège',
      postalCode: '4000',
      country: 'Belgique',
      email: 'contact@techsolutions.be',
      contactPerson: 'Sophie Martin',
      status: 'SUSPENDED',
      domiciliationDate: new Date('2023-12-01'),
      suspensionDate: new Date('2024-01-10'),
      centerId: liegeCenter.id,
    },
  })

  // Create regular users
  const userPassword = await hash('user123', 12)
  await prisma.user.create({
    data: {
      name: 'Jean Francois',
      email: 'jf@beacoon.be',
      password: userPassword,
      role: 'USER',
      phone: '+32 2 345 67 89',
      centerId: bruxellesCenter.id,
      isActive: true,
    },
  })

  await prisma.user.create({
    data: {
      name: 'Philippe Defraine',
      email: 'philippe.defraine@fauquet.be',
      password: userPassword,
      role: 'MANAGER',
      phone: '+32 4 567 89 01',
      centerId: liegeCenter.id,
      isActive: true,
    },
  })

  // Create Meeting Rooms
  await prisma.meetingRoom.create({
    data: {
      name: 'Créative',
      description: 'Salle de réunion créative avec équipement multimédia',
      capacity: 8,
      equipment: JSON.stringify(['WiFi', 'Écran TV 55"', 'Projecteur', 'Whiteboard', 'Système audio']),
      hourlyRate: 25.0,
      centerId: bruxellesCenter.id,
    },
  })

  await prisma.meetingRoom.create({
    data: {
      name: 'Efficace',
      description: 'Salle de réunion pour équipes restreintes',
      capacity: 6,
      equipment: JSON.stringify(['WiFi', 'Écran TV 43"', 'Webcam HD', 'Système de visioconférence']),
      hourlyRate: 20.0,
      centerId: bruxellesCenter.id,
    },
  })

  await prisma.meetingRoom.create({
    data: {
      name: 'Liberty',
      description: 'Espace de réunion informel',
      capacity: 4,
      equipment: JSON.stringify(['WiFi', 'Écran TV 32"']),
      hourlyRate: 15.0,
      centerId: liegeCenter.id,
    },
  })

  // Create Coworking Spaces
  await prisma.coworkingSpace.create({
    data: {
      name: 'Open Space Bruxelles',
      description: 'Espace de coworking ouvert avec vue sur la ville',
      totalSpots: 50,
      dailyRate: 25.0,
      monthlyRate: 300.0,
      yearlyRate: 3000.0,
      amenities: JSON.stringify(['WiFi haut débit', 'Café/thé gratuit', 'Imprimante/scanner', 'Casiers', 'Terrasse']),
      centerId: bruxellesCenter.id,
    },
  })

  await prisma.coworkingSpace.create({
    data: {
      name: 'Creative Hub Liège',
      description: 'Espace créatif pour entrepreneurs et freelances',
      totalSpots: 30,
      dailyRate: 20.0,
      monthlyRate: 250.0,
      yearlyRate: 2500.0,
      amenities: JSON.stringify(['WiFi haut débit', 'Café/thé gratuit', 'Salle de détente', 'Parking gratuit']),
      centerId: liegeCenter.id,
    },
  })

  // Create some packages
  await prisma.package.create({
    data: {
      tracking: 'DHL123456789',
      recipient: 'Jean Dupont',
      sender: 'Amazon',
      enterpriseId: enterprise1.id,
      centerId: bruxellesCenter.id,
      status: 'RECEIVED',
      notes: 'Fragile - Manipulation avec précaution',
    },
  })

  await prisma.package.create({
    data: {
      tracking: 'UPS987654321',
      recipient: 'Philippe Defraine',
      sender: 'Dell Technologies',
      enterpriseId: enterprise2.id,
      centerId: bruxellesCenter.id,
      status: 'COLLECTED',
      collectedAt: new Date(),
      notes: 'Ordinateur portable - Livraison express',
    },
  })

  // Create some mail
  await prisma.mail.create({
    data: {
      recipient: 'GULFGUARD - Jean Dupont',
      sender: 'Ministère des Finances',
      enterpriseId: enterprise1.id,
      centerId: bruxellesCenter.id,
      status: 'RECEIVED',
      notes: 'Courrier officiel - Signature requise',
    },
  })

  // Create some invoices
  await prisma.invoice.create({
    data: {
      number: 'INV-2024-001',
      enterpriseId: enterprise1.id,
      amount: 300.0,
      taxAmount: 63.0,
      totalAmount: 363.0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'PENDING',
    },
  })

  await prisma.invoice.create({
    data: {
      number: 'INV-2024-002',
      enterpriseId: enterprise2.id,
      amount: 250.0,
      taxAmount: 52.5,
      totalAmount: 302.5,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      status: 'PENDING',
    },
  })

  // Create settings
  await prisma.settings.create({
    data: {
      key: 'company_name',
      value: 'WorkOffice',
      type: 'string',
    },
  })

  await prisma.settings.create({
    data: {
      key: 'default_currency',
      value: 'EUR',
      type: 'string',
    },
  })

  await prisma.settings.create({
    data: {
      key: 'notification_email',
      value: 'notifications@workoffice.be',
      type: 'string',
    },
  })

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })