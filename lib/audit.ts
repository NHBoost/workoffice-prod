import { prisma } from './prisma'
import { getClientIP } from './rate-limit'

/**
 * Liste exhaustive des actions auditables.
 * Format : "ressource.verbe" pour faciliter les filtres.
 */
export type AuditAction =
  // Comptes utilisateurs
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.role_change'
  | 'user.deactivate'
  | 'user.reactivate'
  // Auth
  | 'login.success'
  | 'login.failure'
  | 'login.lockout'
  | 'password.reset_request'
  | 'password.reset'
  // Centres
  | 'center.create'
  | 'center.update'
  | 'center.delete'
  // Entreprises
  | 'enterprise.create'
  | 'enterprise.update'
  | 'enterprise.delete'
  | 'enterprise.suspend'
  | 'enterprise.terminate'
  // Facturation
  | 'invoice.create'
  | 'invoice.delete'
  | 'invoice.mark_paid'
  // Mailing
  | 'campaign.create'
  | 'campaign.send'
  | 'campaign.delete'

export interface AuditContext {
  /** L'utilisateur qui a effectue l'action (null si anonyme/login fail) */
  actor?: {
    id?: string | null
    email?: string | null
    role?: string | null
  } | null
  /** Type de ressource impactee : 'User', 'Center', etc. */
  resourceType?: string
  /** ID de la ressource impactee */
  resourceId?: string
  /** Donnees supplementaires (JSON) : valeurs avant/apres, raison, etc. */
  metadata?: Record<string, unknown>
  /** Requete HTTP source pour extraire IP + UA (optionnel) */
  request?: Request | { headers: Headers }
}

/**
 * Enregistre une action sensible dans le journal d'audit.
 *
 * Asynchrone et fire-and-forget — en cas d'echec, log dans la console
 * mais ne bloque jamais l'action metier.
 *
 * Usage :
 *   await audit('user.delete', {
 *     actor: { id: session.user.id, email: session.user.email, role: session.user.role },
 *     resourceType: 'User',
 *     resourceId: deletedUser.id,
 *     metadata: { deletedEmail: deletedUser.email, reason: 'GDPR request' },
 *     request,
 *   })
 */
export async function audit(action: AuditAction, ctx: AuditContext = {}): Promise<void> {
  try {
    let ip: string | undefined
    let userAgent: string | undefined
    if (ctx.request) {
      ip = getClientIP(ctx.request)
      userAgent = ctx.request.headers.get('user-agent') ?? undefined
    }

    await prisma.auditLog.create({
      data: {
        action,
        userId: ctx.actor?.id ?? null,
        userEmail: ctx.actor?.email ?? null,
        userRole: ctx.actor?.role ?? null,
        resourceType: ctx.resourceType ?? null,
        resourceId: ctx.resourceId ?? null,
        metadata: ctx.metadata ? JSON.stringify(ctx.metadata) : null,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    })
  } catch (err) {
    // Audit log est best-effort — un echec ne doit jamais casser l'action
    console.error('[audit] Failed to log action:', action, err)
  }
}
