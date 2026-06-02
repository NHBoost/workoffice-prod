import { CONTRAT_HTML, CGV_HTML, RGPD_HTML } from './contract-templates-data'

/**
 * Helpers pour charger et remplir les templates HTML de contrat.
 *
 * Templates dans /contract-templates/ (a la racine du projet) :
 *   - contrat.html  : convention de prestations (variables {{xxx.yyy}})
 *   - cgv.html      : conditions generales (texte fixe)
 *   - rgpd.html     : politique RGPD (2 variables)
 *
 * Variables identifiees (notation dot pour grouper) :
 *   centre.nom, centre.adresse, centre.ville
 *   date.jour, date.jourCourt
 *   eid.nom, eid.prenom, eid.adresseComplete, eid.dateNaissance,
 *   eid.lieuNaissance, eid.nationalite, eid.numeroCarte,
 *   eid.dateDebutValidite, eid.dateFinValidite, eid.registreNational
 *   entreprise.nom, entreprise.formejuridique, entreprise.tva,
 *   entreprise.nace, entreprise.email, entreprise.telephone,
 *   entreprise.administrateur, entreprise.dateconstitution,
 *   entreprise.adresseSiege (siege actuel du client, fallback Prestigia)
 *   formule.montantMensuel, formule.garantie
 */

export interface ContractVariables {
  centre: { nom: string; adresse: string; ville: string }
  date: { jour: string; jourCourt: string }
  eid: {
    nom: string
    prenom: string
    adresseComplete: string
    dateNaissance: string
    lieuNaissance: string
    nationalite: string
    numeroCarte: string
    dateDebutValidite: string
    dateFinValidite: string
    registreNational: string
  }
  entreprise: {
    nom: string
    formejuridique: string
    tva: string
    nace: string
    email: string
    telephone: string
    administrateur: string
    dateconstitution: string
    adresseSiege: string
  }
  formule: {
    montantMensuel: string
    garantie: string
  }
}

// Les 3 templates HTML sont inlinés à la compilation (cf. contract-templates-data.ts
// auto-genere depuis les .html). Approche plus fiable que de lire les fichiers
// au runtime depuis Vercel serverless ou outputFileTracingIncludes parfois capricieux.
const TEMPLATES: Record<'contrat' | 'cgv' | 'rgpd', string> = {
  contrat: CONTRAT_HTML,
  cgv: CGV_HTML,
  rgpd: RGPD_HTML,
}

function loadTemplate(name: 'contrat' | 'cgv' | 'rgpd'): string {
  return TEMPLATES[name]
}

/**
 * Remplace toutes les occurrences de {{objet.prop}} par les valeurs fournies.
 * Renvoie le HTML + la liste des variables non remplies (alerte de QA).
 */
export function fillTemplate(
  html: string,
  vars: ContractVariables
): { html: string; missing: string[] } {
  const flat: Record<string, string> = {}
  // Aplatit l'objet en chemins dot (centre.nom, eid.numeroCarte, etc.)
  for (const [section, fields] of Object.entries(vars)) {
    for (const [key, value] of Object.entries(fields as Record<string, string>)) {
      flat[`${section}.${key}`] = String(value ?? '')
    }
  }

  const missing = new Set<string>()
  const filled = html.replace(/\{\{([^}]+)\}\}/g, (_match, name: string) => {
    const trimmed = name.trim()
    if (trimmed in flat) return escapeHtml(flat[trimmed])
    missing.add(trimmed)
    return `{{${trimmed}}}` // garde le placeholder pour signaler le manquant
  })

  return { html: filled, missing: Array.from(missing) }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Wrap un fragment HTML dans un document complet stylé pour Puppeteer.
 * Page A4, marges optimisées, typo lisible.
 */
export function wrapAsDocument(bodyHtml: string, opts: { title?: string } = {}): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${opts.title ?? 'Contrat Prestigia'}</title>
<style>
  @page { size: A4; margin: 20mm 15mm; }
  body {
    font-family: 'Arial', 'Helvetica', sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #1a1a1a;
  }
  h1 { font-size: 16pt; color: #C9A227; border-bottom: 2px solid #C9A227; padding-bottom: 6pt; margin-top: 0; }
  h2 { font-size: 12pt; color: #1a1a1a; margin-top: 18pt; }
  h3 { font-size: 11pt; margin-top: 14pt; }
  p { margin: 6pt 0; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
  td, th { border: 1px solid #ccc; padding: 6pt 8pt; vertical-align: top; }
  th, .label { background: #f5f5f5; font-weight: 600; }
  strong { font-weight: 700; }
  ul, ol { padding-left: 20pt; }
  li { margin: 3pt 0; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}

/**
 * Charge et rempli les 3 templates en un coup. Retourne 3 HTMLs prets a render
 * en PDF + la liste consolidee des variables non remplies.
 */
export function renderAllContractTemplates(vars: ContractVariables): {
  contrat: string
  cgv: string
  rgpd: string
  missing: string[]
} {
  const contratRaw = loadTemplate('contrat')
  const cgvRaw = loadTemplate('cgv')
  const rgpdRaw = loadTemplate('rgpd')

  const a = fillTemplate(contratRaw, vars)
  const b = fillTemplate(cgvRaw, vars)
  const c = fillTemplate(rgpdRaw, vars)

  const missing = Array.from(new Set([...a.missing, ...b.missing, ...c.missing]))

  return {
    contrat: wrapAsDocument(a.html, { title: 'Convention de prestations' }),
    cgv: wrapAsDocument(b.html, { title: 'Conditions Générales' }),
    rgpd: wrapAsDocument(c.html, { title: 'Politique de confidentialité' }),
    missing,
  }
}

/**
 * Mappe un Client + Center vers le format ContractVariables.
 * Centralise la logique de formatage (dates fr-FR, montants, etc.).
 */
export function clientToVariables(input: {
  client: any
  center: { name: string; address: string; city: string }
  numeroCarteClair: string
  registreNationalClair: string
}): ContractVariables {
  const { client, center, numeroCarteClair, registreNationalClair } = input

  const fr = (d: Date | string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const frShort = (d: Date | string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const eur = (n: number) =>
    new Intl.NumberFormat('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  // Calcul de l'equivalent mensuel HT pour le contrat
  // (les CGV parlent de "deux mensualites" de garantie)
  const periodicite = client.periodicite || 'MENSUEL'
  const montantHt = Number(client.montantHt)
  let montantMensuelHt: number
  switch (periodicite) {
    case 'TRIMESTRIEL': montantMensuelHt = montantHt / 3; break
    case 'ANNUEL':      montantMensuelHt = montantHt / 10; break // 2 mois offerts
    default:            montantMensuelHt = montantHt
  }
  const garantie = montantMensuelHt * 2 // 2 mensualites HT

  return {
    centre: {
      nom: center.name,
      adresse: center.address,
      ville: center.city,
    },
    date: {
      jour: fr(new Date()),
      jourCourt: frShort(new Date()),
    },
    eid: {
      nom: client.nom,
      prenom: client.prenom,
      adresseComplete: client.adressePersonnelle,
      dateNaissance: fr(client.dateNaissance),
      lieuNaissance: client.lieuNaissance,
      nationalite: client.nationalite,
      numeroCarte: numeroCarteClair,
      dateDebutValidite: fr(client.ciDebutValidite),
      dateFinValidite: fr(client.ciFinValidite),
      registreNational: registreNationalClair,
    },
    entreprise: {
      nom: client.societeDenomination,
      formejuridique: client.formeJuridique,
      tva: client.numeroTva || client.bce,
      nace: client.secteurActivite,
      email: client.emailSociete,
      telephone: client.telephoneSociete,
      administrateur: `${client.prenom} ${client.nom} (${client.fonction})`,
      dateconstitution: fr(client.dateConstitution),
      // Adresse du siege social du Client (saisie au formulaire).
      // Defaut : adresse Prestigia si vide.
      adresseSiege: (client.adresseSiege && client.adresseSiege.trim())
        || 'Lozenberg 21, 1932 Zaventem',
    },
    formule: {
      montantMensuel: eur(montantMensuelHt),
      garantie: eur(garantie),
    },
  }
}
