import { z } from 'zod'

/**
 * Schemas Zod pour l'encodage et l'edition d'un Client.
 * Centralisés ici car partagés entre POST /api/clients et PATCH /api/clients/[id].
 */

// === Validations atomiques ===

// BCE belge : 10 chiffres (avec ou sans points / espaces)
const bceRegex = /^\d{4}[.\s]?\d{3}[.\s]?\d{3}$/
// TVA belge : BE + 10 chiffres (BCE = TVA dans 99% des cas)
const tvaRegex = /^(BE)?[\s.]?\d{4}[.\s]?\d{3}[.\s]?\d{3}$/i
// Telephone belge ou international (laxiste)
const phoneRegex = /^[+\d][\d\s.\-()]{6,20}$/

// === Section A ===
export const societeSchema = z.object({
  societeDenomination: z.string().trim().min(1, 'Dénomination requise').max(200),
  formeJuridique: z.string().trim().min(1, 'Forme juridique requise').max(100),
  bce: z.string().trim().regex(bceRegex, 'Numéro BCE invalide (10 chiffres)'),
  numeroTva: z.string().trim().regex(tvaRegex, 'Numéro de TVA invalide'),
  adresseSiege: z.string().trim().min(1, 'Adresse requise').max(300),
  emailSociete: z.string().trim().email('Email société invalide').toLowerCase(),
  telephoneSociete: z.string().trim().regex(phoneRegex, 'Téléphone invalide'),
  secteurActivite: z.string().trim().min(1, 'Secteur requis').max(200),
  dateConstitution: z.coerce.date().refine(d => d < new Date(), 'La date de constitution doit être dans le passé'),
})

// === Section B ===
export const personnePhysiqueSchema = z.object({
  nom: z.string().trim().min(1, 'Nom requis').max(100),
  prenom: z.string().trim().min(1, 'Prénom requis').max(100),
  fonction: z.string().trim().min(1, 'Fonction requise').max(100),
  adressePersonnelle: z.string().trim().min(1, 'Adresse requise').max(300),
  dateNaissance: z.coerce.date().refine(d => d < new Date(), 'Date de naissance dans le passé'),
  lieuNaissance: z.string().trim().min(1).max(100),
  nationalite: z.string().trim().min(1).max(100),
  numeroCi: z.string().trim().min(6, 'N° CI trop court').max(50),
  ciDebutValidite: z.coerce.date(),
  ciFinValidite: z.coerce.date(),
  registreNational: z.string().trim().min(10, 'N° registre national invalide').max(50),
  emailPerso: z.string().trim().email('Email personnel invalide').toLowerCase(),
  telephonePerso: z.string().trim().regex(phoneRegex, 'Téléphone invalide'),
})

// === Section C — Formules Prestigia officielles ===
export const FORMULES = [
  'SS_PERSONNE_MORALE',  // Siege social - SRL, SA, SNC, SComm, SC
  'SS_ASBL',             // Siege social - ASBL
  'UE',                  // Unite d'Etablissement
  'PACK_SS_UE',          // Pack Siege Social + Unite d'Etablissement (tarif preferentiel)
] as const

export type Formule = (typeof FORMULES)[number]

export const FORMULE_LABELS: Record<Formule, string> = {
  SS_PERSONNE_MORALE: 'Domiciliation Siège Social — Personne morale',
  SS_ASBL: 'Domiciliation Siège Social — ASBL',
  UE: "Unité d'Établissement",
  PACK_SS_UE: "Pack Siège Social + Unité d'Établissement",
}

// === Periodicite de facturation ===
export const PERIODICITES = ['MENSUEL', 'TRIMESTRIEL', 'ANNUEL'] as const
export type Periodicite = (typeof PERIODICITES)[number]

export const PERIODICITE_LABELS: Record<Periodicite, string> = {
  MENSUEL: 'Mensuel',
  TRIMESTRIEL: 'Trimestriel',
  ANNUEL: 'Annuel (2 mois offerts)',
}

/**
 * Grille tarifaire officielle Prestigia (HTVA).
 * Source : doc fournie par le client.
 *
 * Pour le PACK, le tarif est preferentiel et a definir manuellement
 * (depend du package commercial — on laisse l'admin saisir le montant).
 */
export const PRICING: Record<Formule, Record<Periodicite, number | null>> = {
  SS_PERSONNE_MORALE: { MENSUEL: 49, TRIMESTRIEL: 147, ANNUEL: 490 },
  SS_ASBL: { MENSUEL: 25, TRIMESTRIEL: 75, ANNUEL: 250 },
  UE: { MENSUEL: 60, TRIMESTRIEL: 150, ANNUEL: 300 },
  PACK_SS_UE: { MENSUEL: null, TRIMESTRIEL: null, ANNUEL: null }, // saisie manuelle
}

/**
 * Helper : retourne le montant pre-rempli selon formule + periodicite.
 * Renvoie 0 si pas de tarif officiel (cas du PACK_SS_UE).
 */
export function getPriceFor(formule: Formule, periodicite: Periodicite): number {
  return PRICING[formule]?.[periodicite] ?? 0
}

/**
 * Helper : montant equivalent mensuel HT (pour facturation interne et contrat).
 * Pour ANNUEL avec 2 mois offerts → on divise par 10 (pas 12) pour le HT/mois reel.
 */
export function getMonthlyEquivalent(totalAmount: number, periodicite: Periodicite): number {
  switch (periodicite) {
    case 'MENSUEL':
      return totalAmount
    case 'TRIMESTRIEL':
      return totalAmount / 3
    case 'ANNUEL':
      // 2 mois offerts → le montant correspond a 10 mois reels
      return totalAmount / 10
  }
}

export const domiciliationSchema = z.object({
  centerId: z.string().trim().min(1, 'Centre requis'),
  formule: z.enum(FORMULES),
  periodicite: z.enum(PERIODICITES).default('MENSUEL'),
  dateDebut: z.coerce.date(),
  dureeMois: z.coerce.number().int().min(1).max(120).default(12),
  montantHt: z.coerce.number().positive('Montant HT > 0').max(100000),
  tvaTaux: z.coerce.number().min(0).max(100).default(21),
})

// === Combinaison + cross-field ===
export const createClientSchema = societeSchema
  .merge(personnePhysiqueSchema)
  .merge(domiciliationSchema)
  .refine(d => d.ciFinValidite > d.ciDebutValidite, {
    message: 'La fin de validité de la CI doit être postérieure au début',
    path: ['ciFinValidite'],
  })

// PATCH : tous les champs optionnels (edition partielle)
export const updateClientSchema = z
  .object({
    ...societeSchema.shape,
    ...personnePhysiqueSchema.shape,
    ...domiciliationSchema.shape,
  })
  .partial()

export type CreateClientInput = z.infer<typeof createClientSchema>
