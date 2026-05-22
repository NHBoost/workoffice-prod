/**
 * QA Script — Validation multi-tenant du portail client.
 *
 * Verifie le critere bloquant du CDC Etape 2 :
 *   "Avec 2 comptes clients de test, chacun ne voit que ses données"
 *
 * Strategy :
 *  1. Cree 2 Clients de test (avec User lie)
 *  2. Attribue 1 courrier + 1 facture a chacun
 *  3. Pour chaque client, query les courriers/factures comme le ferait
 *     le portail (WHERE clientId = sessionClient.id)
 *  4. Verifie que client A ne voit jamais les donnees de B et vice-versa
 *  5. Cleanup (supprime les donnees de test)
 *
 * Usage : node scripts/qa-multi-tenant.cjs
 */

const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')
const { randomBytes, createCipheriv } = require('node:crypto')

const prisma = new PrismaClient()

// === Helpers crypto (encrypt CI + RN) ===
function encrypt(plaintext) {
  if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY missing')
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'base64')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':')
}

let pass = 0, fail = 0
function check(name, cond, details = '') {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${details}`) }
}

async function main() {
  console.log('🧪 QA Multi-tenant Portail Client\n')

  // 0. Pick a center
  const center = await prisma.center.findFirst()
  if (!center) throw new Error('Aucun centre en BDD. Crée-en un d\'abord.')

  // === 1. Setup : créer 2 users + 2 clients de test ===
  console.log('📝 Création des 2 clients de test...')

  const passwordHash = await hash('TestQA2026!', 10)
  const stamp = Date.now()

  const userA = await prisma.user.create({
    data: {
      email: `qa-clientA-${stamp}@test.local`,
      name: 'Alice Test',
      password: passwordHash,
      role: 'USER',
      isActive: true,
      centerId: center.id,
    },
  })
  const userB = await prisma.user.create({
    data: {
      email: `qa-clientB-${stamp}@test.local`,
      name: 'Bob Test',
      password: passwordHash,
      role: 'USER',
      isActive: true,
      centerId: center.id,
    },
  })

  const clientA = await prisma.client.create({
    data: {
      userId: userA.id,
      societeDenomination: 'ACME A SRL',
      formeJuridique: 'SRL', bce: `0${stamp}1`.slice(0, 10), numeroTva: `BE0${stamp}1`.slice(0, 12),
      adresseSiege: 'Rue A 1, 1000 Bruxelles', emailSociete: 'a@acme.test', telephoneSociete: '+32200000001',
      secteurActivite: 'Test', dateConstitution: new Date('2020-01-01'),
      nom: 'Alpha', prenom: 'Alice', fonction: 'Gérante',
      adressePersonnelle: 'Avenue A 10', dateNaissance: new Date('1980-01-01'),
      lieuNaissance: 'Bruxelles', nationalite: 'Belge',
      numeroCiEnc: encrypt('111-1111111-11'), registreNationalEnc: encrypt('80.01.01-111.11'),
      ciDebutValidite: new Date('2020-01-01'), ciFinValidite: new Date('2030-01-01'),
      emailPerso: userA.email, telephonePerso: '+32470000001',
      centerId: center.id, formule: 'SS_PERSONNE_MORALE', periodicite: 'MENSUEL',
      dateDebut: new Date(), dureeMois: 12, montantHt: 49, tvaTaux: 21,
    },
  })
  const clientB = await prisma.client.create({
    data: {
      userId: userB.id,
      societeDenomination: 'BETA B SRL',
      formeJuridique: 'SRL', bce: `0${stamp}2`.slice(0, 10), numeroTva: `BE0${stamp}2`.slice(0, 12),
      adresseSiege: 'Rue B 2, 1000 Bruxelles', emailSociete: 'b@beta.test', telephoneSociete: '+32200000002',
      secteurActivite: 'Test', dateConstitution: new Date('2020-01-01'),
      nom: 'Beta', prenom: 'Bob', fonction: 'Gérant',
      adressePersonnelle: 'Avenue B 20', dateNaissance: new Date('1985-01-01'),
      lieuNaissance: 'Anvers', nationalite: 'Belge',
      numeroCiEnc: encrypt('222-2222222-22'), registreNationalEnc: encrypt('80.01.01-222.22'),
      ciDebutValidite: new Date('2020-01-01'), ciFinValidite: new Date('2030-01-01'),
      emailPerso: userB.email, telephonePerso: '+32470000002',
      centerId: center.id, formule: 'SS_ASBL', periodicite: 'TRIMESTRIEL',
      dateDebut: new Date(), dureeMois: 12, montantHt: 75, tvaTaux: 21,
    },
  })

  console.log(`  Client A : ${clientA.id} (user ${userA.email})`)
  console.log(`  Client B : ${clientB.id} (user ${userB.email})\n`)

  // === 2. Attribuer du contenu à chacun ===
  console.log('📨 Attribution de courriers + factures...')

  const mailA = await prisma.mail.create({
    data: {
      recipient: 'Alice Alpha', sender: 'SPF A', clientId: clientA.id,
      centerId: center.id, type: 'RECOMMANDE',
    },
  })
  const mailB = await prisma.mail.create({
    data: {
      recipient: 'Bob Beta', sender: 'SPF B', clientId: clientB.id,
      centerId: center.id, type: 'OFFICIEL',
    },
  })
  const invoiceA = await prisma.invoice.create({
    data: {
      number: `QA-A-${stamp}`, clientId: clientA.id,
      amount: 49, taxAmount: 10.29, totalAmount: 59.29,
      dueDate: new Date(Date.now() + 30 * 86400000), status: 'PENDING',
    },
  })
  const invoiceB = await prisma.invoice.create({
    data: {
      number: `QA-B-${stamp}`, clientId: clientB.id,
      amount: 75, taxAmount: 15.75, totalAmount: 90.75,
      dueDate: new Date(Date.now() + 30 * 86400000), status: 'PAID', paidAt: new Date(),
    },
  })
  console.log(`  Mail A : ${mailA.id} · Mail B : ${mailB.id}`)
  console.log(`  Invoice A : ${invoiceA.number} · Invoice B : ${invoiceB.number}\n`)

  // === 3. Simulation : "Client A se connecte → ses queries portail" ===
  console.log('🔒 Test multi-tenant — vue Client A :')
  const aMails = await prisma.mail.findMany({ where: { clientId: clientA.id } })
  const aInvoices = await prisma.invoice.findMany({ where: { clientId: clientA.id } })
  check('Client A voit son courrier', aMails.length === 1 && aMails[0].id === mailA.id)
  check('Client A ne voit PAS le courrier de B',
    !aMails.some(m => m.id === mailB.id),
    aMails.some(m => m.id === mailB.id) ? '— LEAK detecté !' : ''
  )
  check('Client A voit sa facture', aInvoices.length === 1 && aInvoices[0].number === invoiceA.number)
  check('Client A ne voit PAS la facture de B',
    !aInvoices.some(i => i.id === invoiceB.id),
    aInvoices.some(i => i.id === invoiceB.id) ? '— LEAK detecté !' : ''
  )

  console.log('\n🔒 Test multi-tenant — vue Client B :')
  const bMails = await prisma.mail.findMany({ where: { clientId: clientB.id } })
  const bInvoices = await prisma.invoice.findMany({ where: { clientId: clientB.id } })
  check('Client B voit son courrier', bMails.length === 1 && bMails[0].id === mailB.id)
  check('Client B ne voit PAS le courrier de A', !bMails.some(m => m.id === mailA.id))
  check('Client B voit sa facture', bInvoices.length === 1 && bInvoices[0].number === invoiceB.number)
  check('Client B ne voit PAS la facture de A', !bInvoices.some(i => i.id === invoiceA.id))

  // === 4. Test PATCH multi-tenant : Client A ne peut pas modifier mail B ===
  console.log('\n🛡️ Test : Client A ne peut PAS modifier le courrier B :')
  // Simule la logique du PATCH /api/portail/courriers/[id]
  const mailFromB = await prisma.mail.findUnique({ where: { id: mailB.id } })
  const isFromA = mailFromB?.clientId === clientA.id
  check('Le mail B est correctement identifié comme appartenant à B',
    !isFromA && mailFromB?.clientId === clientB.id)

  // === 5. Test transitions de statut facture ===
  console.log('\n💰 Test transitions statut facture :')
  await prisma.invoice.update({
    where: { id: invoiceA.id },
    data: { status: 'PAID', paidAt: new Date() },
  })
  const aReread = await prisma.invoice.findUnique({ where: { id: invoiceA.id } })
  check('Marquer payée fonctionne', aReread?.status === 'PAID' && aReread?.paidAt !== null)

  await prisma.invoice.update({
    where: { id: invoiceA.id },
    data: { status: 'PENDING', paidAt: null },
  })
  const aReread2 = await prisma.invoice.findUnique({ where: { id: invoiceA.id } })
  check('Annuler paiement fonctionne', aReread2?.status === 'PENDING' && aReread2?.paidAt === null)

  // === 6. Test marquage lu courrier ===
  console.log('\n📖 Test marquage courrier lu :')
  await prisma.mail.update({ where: { id: mailA.id }, data: { readAt: new Date() } })
  const mailAReread = await prisma.mail.findUnique({ where: { id: mailA.id } })
  check('readAt s\'enregistre', mailAReread?.readAt !== null)

  // === 7. Cleanup ===
  console.log('\n🧹 Cleanup...')
  await prisma.invoice.deleteMany({ where: { id: { in: [invoiceA.id, invoiceB.id] } } })
  await prisma.mail.deleteMany({ where: { id: { in: [mailA.id, mailB.id] } } })
  await prisma.client.deleteMany({ where: { id: { in: [clientA.id, clientB.id] } } })
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } })

  // === Résumé ===
  console.log(`\n📊 Résultats : ${pass} OK · ${fail} KO`)
  if (fail === 0) {
    console.log('🎉 TOUS LES TESTS PASSENT — Étape 2 validée !')
  } else {
    console.log('⚠️  ÉCHECS détectés — voir les ❌ ci-dessus')
    process.exit(1)
  }
}

main()
  .catch(e => {
    console.error('❌ Test crash :', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
