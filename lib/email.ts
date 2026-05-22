import { Resend } from 'resend'

/**
 * Wrapper Resend pour l'envoi d'emails transactionnels.
 *
 * Setup :
 *  - process.env.RESEND_API_KEY     : cle API depuis resend.com/api-keys
 *  - process.env.EMAIL_FROM         : "Prestigia <noreply@prestigia.com>" (domaine verifie)
 *                                     fallback : 'onboarding@resend.dev' (Resend default)
 *
 * Si RESEND_API_KEY n'est pas defini (dev sans Resend), les emails sont logges
 * en console et la fonction renvoie une fausse reussite.
 */

const FROM_DEFAULT = 'Prestigia <noreply@prestigia.com>'
const FROM_FALLBACK = 'onboarding@resend.dev'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

function getFrom(): string {
  return process.env.EMAIL_FROM || FROM_DEFAULT
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  /** Pieces jointes (ex: PDF de contrat). buffer = contenu binaire */
  attachments?: { filename: string; content: Buffer }[]
  /** Reply-to si different de FROM */
  replyTo?: string
}

export interface SendEmailResult {
  ok: boolean
  id?: string
  error?: string
}

/**
 * Envoie un email transactionnel. Resilient : si Resend echoue, log en console
 * et retourne ok:false sans throw (pour que l'appelant decide d'interrompre ou non).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const resend = getResend()

  // Mode dev sans cle Resend : log uniquement
  if (!resend) {
    console.log('[email] (dev mode, no RESEND_API_KEY) Would send to:', opts.to)
    console.log('[email] Subject:', opts.subject)
    console.log('[email] HTML length:', opts.html.length)
    if (opts.attachments) console.log('[email] Attachments:', opts.attachments.map(a => a.filename))
    return { ok: true, id: 'dev-mode' }
  }

  try {
    const from = getFrom()
    const result = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo,
      attachments: opts.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
      })),
    })

    if (result.error) {
      console.error('[email] Resend error:', result.error)
      // Fallback automatique sur onboarding@resend.dev si le domaine custom n'est pas verifie
      if (from !== FROM_FALLBACK && /domain/i.test(JSON.stringify(result.error))) {
        console.warn('[email] Retrying with fallback FROM:', FROM_FALLBACK)
        const fallback = await resend.emails.send({
          from: FROM_FALLBACK,
          to: opts.to,
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
          replyTo: opts.replyTo,
          attachments: opts.attachments?.map(a => ({ filename: a.filename, content: a.content })),
        })
        if (fallback.error) {
          return { ok: false, error: JSON.stringify(fallback.error) }
        }
        return { ok: true, id: fallback.data?.id }
      }
      return { ok: false, error: JSON.stringify(result.error) }
    }
    return { ok: true, id: result.data?.id }
  } catch (err: any) {
    console.error('[email] Send threw:', err)
    return { ok: false, error: err?.message ?? String(err) }
  }
}

/* ============================================================
   Templates HTML reutilisables
   ============================================================ */

const baseStyles = `
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; background: #fafafa; }
  .card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 32px; }
  .brand { font-family: Georgia, serif; font-size: 24px; color: #C9A227; margin-bottom: 8px; letter-spacing: -0.5px; }
  .brand-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 32px; }
  h1 { font-size: 20px; margin: 0 0 16px; color: #1a1a1a; }
  p { margin: 12px 0; font-size: 15px; }
  .btn { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #C9A227 0%, #A1801F 100%); color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
  .footer { font-size: 12px; color: #999; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; }
`

/** Email d'invitation : lien pour definir le mot de passe (token 7j). */
export function setupPasswordEmail(opts: {
  prenom: string
  setupUrl: string
  portalUrl: string
}): { subject: string; html: string; text: string } {
  return {
    subject: 'Activez votre espace client Prestigia',
    html: `
      <!doctype html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
        <div class="card">
          <div class="brand">Prestigia</div>
          <div class="brand-sub">Business Center</div>
          <h1>Bienvenue ${opts.prenom},</h1>
          <p>Votre espace client Prestigia est prêt. Pour finaliser la création de votre compte,
          définissez votre mot de passe en cliquant sur le bouton ci-dessous.</p>
          <p style="text-align:center;"><a href="${opts.setupUrl}" class="btn">Définir mon mot de passe</a></p>
          <p>Ce lien est valable <strong>7 jours</strong>. Au-delà, contactez-nous pour en générer un nouveau.</p>
          <p>Une fois votre mot de passe défini, vous pourrez accéder à votre espace client :
          <br><a href="${opts.portalUrl}">${opts.portalUrl}</a></p>
          <div class="footer">
            <p>Vous recevez cet email car un compte a été créé pour vous chez Prestigia.<br>
            Si vous pensez avoir reçu cet email par erreur, vous pouvez l'ignorer.</p>
          </div>
        </div>
      </body></html>
    `,
    text: `Bienvenue ${opts.prenom},\n\nVotre espace client Prestigia est prêt. Définissez votre mot de passe ici :\n${opts.setupUrl}\n\nCe lien est valable 7 jours.\n\nEspace client : ${opts.portalUrl}`,
  }
}

/** Email de notification d'un nouveau courrier recu dans le portail. */
export function newMailEmail(opts: {
  prenom: string
  type: string             // STANDARD / RECOMMANDE / COLIS / OFFICIEL
  sender?: string | null
  portalUrl: string
}): { subject: string; html: string; text: string } {
  const TYPE_LABELS: Record<string, string> = {
    STANDARD: 'Courrier standard',
    RECOMMANDE: 'Courrier recommandé',
    COLIS: 'Colis',
    OFFICIEL: 'Courrier officiel',
  }
  const typeLabel = TYPE_LABELS[opts.type] ?? 'Courrier'
  const isUrgent = opts.type === 'RECOMMANDE' || opts.type === 'OFFICIEL'

  return {
    subject: isUrgent
      ? `🔔 [${typeLabel}] Un courrier important vous attend`
      : `Nouveau courrier dans votre espace Prestigia`,
    html: `
      <!doctype html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
        <div class="card">
          <div class="brand">Prestigia</div>
          <div class="brand-sub">Business Center</div>
          <h1>Bonjour ${opts.prenom},</h1>
          <p>Un nouveau <strong>${typeLabel.toLowerCase()}</strong> vient d'être enregistré
          dans votre espace client Prestigia${opts.sender ? `, de la part de <strong>${opts.sender}</strong>` : ''}.</p>
          ${isUrgent ? `<p style="background:#fef3c7;border-left:3px solid #C9A227;padding:10px 14px;border-radius:6px;color:#92400e;">
            ⚠️ Ce courrier nécessite votre attention. Pensez à le consulter rapidement.
          </p>` : ''}
          <p style="text-align:center;"><a href="${opts.portalUrl}" class="btn">Consulter mon courrier</a></p>
          <p>Vous pouvez télécharger le scan PDF et marquer le courrier comme lu depuis votre espace.</p>
          <div class="footer">
            <p>SRL Prestigia · Lozenberg 21, 1932 Zaventem · BCE 1031.227.487<br>
            Vous recevez cet email car un courrier vous a été attribué dans votre espace client.</p>
          </div>
        </div>
      </body></html>
    `,
    text: `Bonjour ${opts.prenom},\n\nUn nouveau ${typeLabel.toLowerCase()} vient d'être enregistré dans votre espace Prestigia${opts.sender ? ` de la part de ${opts.sender}` : ''}.\n\n${isUrgent ? '⚠️ Ce courrier nécessite votre attention.\n\n' : ''}Consultez-le : ${opts.portalUrl}\n\nSRL Prestigia`,
  }
}

/** Email a la creation d'une nouvelle facture. */
export function newInvoiceEmail(opts: {
  prenom: string
  number: string
  totalAmount: number
  dueDate: Date | string
  portalUrl: string
  hasPdf: boolean
}): { subject: string; html: string; text: string } {
  const due = new Date(opts.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const amount = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(opts.totalAmount)
  return {
    subject: `Nouvelle facture ${opts.number} — ${amount}`,
    html: `
      <!doctype html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
        <div class="card">
          <div class="brand">Prestigia</div>
          <div class="brand-sub">Business Center</div>
          <h1>Bonjour ${opts.prenom},</h1>
          <p>Votre nouvelle facture <strong>${opts.number}</strong> est désormais disponible dans votre espace client.</p>
          <div style="background:#fafafa;border:1px solid #e5e5e5;border-radius:10px;padding:16px;margin:16px 0;">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:#666;">Montant TTC</span><strong>${amount}</strong></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:#666;">Échéance</span><strong>${due}</strong></div>
          </div>
          <p style="text-align:center;"><a href="${opts.portalUrl}" class="btn">Consulter ma facture</a></p>
          ${opts.hasPdf ? '<p>Le PDF est téléchargeable directement depuis votre espace.</p>' : ''}
          <p style="font-size:13px;color:#666;">Le règlement s'effectue par virement bancaire selon les coordonnées indiquées sur le document.</p>
          <div class="footer">
            <p>SRL Prestigia · Lozenberg 21, 1932 Zaventem · BCE 1031.227.487</p>
          </div>
        </div>
      </body></html>
    `,
    text: `Bonjour ${opts.prenom},\n\nVotre nouvelle facture ${opts.number} (${amount}, échéance ${due}) est disponible dans votre espace client.\n\nConsultez-la : ${opts.portalUrl}\n\nSRL Prestigia`,
  }
}

/** Email de confirmation de paiement d'une facture. */
export function invoicePaidEmail(opts: {
  prenom: string
  number: string
  totalAmount: number
  portalUrl: string
}): { subject: string; html: string; text: string } {
  const amount = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(opts.totalAmount)
  return {
    subject: `✓ Paiement reçu — Facture ${opts.number}`,
    html: `
      <!doctype html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
        <div class="card">
          <div class="brand">Prestigia</div>
          <div class="brand-sub">Business Center</div>
          <h1>Merci ${opts.prenom} 🎉</h1>
          <p>Nous avons bien réceptionné le paiement de votre facture <strong>${opts.number}</strong> d'un montant de <strong>${amount}</strong>.</p>
          <p style="background:#d1fae5;border-left:3px solid #10b981;padding:10px 14px;border-radius:6px;color:#065f46;">
            ✓ Votre facture est marquée comme payée dans votre espace client.
          </p>
          <p style="text-align:center;"><a href="${opts.portalUrl}" class="btn">Voir mon espace client</a></p>
          <div class="footer">
            <p>SRL Prestigia · Lozenberg 21, 1932 Zaventem · BCE 1031.227.487</p>
          </div>
        </div>
      </body></html>
    `,
    text: `Merci ${opts.prenom},\n\nNous avons bien reçu le paiement de votre facture ${opts.number} (${amount}). Elle est désormais marquée comme payée.\n\nVotre espace : ${opts.portalUrl}\n\nSRL Prestigia`,
  }
}

/** Email d'envoi du contrat avec PDF en piece jointe. */
export function contractEmail(opts: {
  prenom: string
  societe: string
  formule: string
}): { subject: string; html: string; text: string } {
  return {
    subject: `Votre contrat Prestigia — ${opts.societe}`,
    html: `
      <!doctype html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
        <div class="card">
          <div class="brand">Prestigia</div>
          <div class="brand-sub">Business Center</div>
          <h1>Votre contrat est prêt ${opts.prenom},</h1>
          <p>Veuillez trouver ci-joint le contrat de prestations de services pour
          <strong>${opts.societe}</strong> (formule : ${opts.formule}).</p>
          <p>Le document comprend :</p>
          <ul>
            <li>La Convention de prestations de services</li>
            <li>Annexe 1 — Conditions Générales</li>
            <li>Annexe 4 — Politique de confidentialité (RGPD)</li>
          </ul>
          <p>Merci de nous retourner le contrat signé par retour d'email ou via votre espace client.</p>
          <div class="footer">
            <p>SRL Prestigia · Lozenberg 21, 1932 Zaventem · BCE 1031.227.487</p>
          </div>
        </div>
      </body></html>
    `,
    text: `Bonjour ${opts.prenom},\n\nVeuillez trouver ci-joint votre contrat Prestigia pour ${opts.societe} (formule ${opts.formule}).\n\nMerci de nous le retourner signé.\n\nSRL Prestigia`,
  }
}
