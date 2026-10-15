import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api-rate-limit'
import {
  ALLOWED_DOC_MIME,
  MAX_DOC_BYTES,
  createUploadUrl,
  extFromFilename,
  resolveMime,
} from '@/lib/storage'
import { z } from 'zod'

const schema = z.object({
  // 'mail'        : courrier cree depuis /dashboard/courriers/nouveau
  // 'client-mail' : courrier attribue depuis la fiche client (PDF uniquement)
  purpose: z.enum(['mail', 'client-mail']),
  filename: z.string().min(1).max(255),
  mime: z.string().max(200).optional(),
  size: z.number().int().positive(),
  centerId: z.string().optional(),
  clientId: z.string().optional(),
})

/**
 * POST /api/uploads/sign
 *
 * Retourne une URL d'upload signee Supabase pour que le navigateur envoie
 * le fichier DIRECTEMENT au storage (pas de transit par Vercel, donc pas
 * de limite ~4,5 Mo). Le chemin est impose par le serveur et rattache au
 * centre / client, ce qui permet a l'API de creation de le valider ensuite.
 */
export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(request, 'upload_sign', { max: 30, window: 60_000 })
  if (rl) return rl
  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const data = schema.parse(await request.json())
    const isManager = session!.user.role === 'MANAGER'

    if (data.size > MAX_DOC_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 20 Mo)' }, { status: 400 })
    }
    const mime = resolveMime(data.filename, data.mime)

    let path: string
    if (data.purpose === 'mail') {
      if (!data.centerId) return NextResponse.json({ error: 'Centre requis' }, { status: 400 })
      if (isManager && data.centerId !== session!.user.centerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (!ALLOWED_DOC_MIME.includes(mime)) {
        return NextResponse.json(
          { error: 'Type de fichier non supporté (PDF, DOC/DOCX, XLS/XLSX, JPG, PNG acceptés)' },
          { status: 400 }
        )
      }
      path = `mails/${data.centerId}/${randomUUID()}${extFromFilename(data.filename)}`
    } else {
      if (!data.clientId) return NextResponse.json({ error: 'Client requis' }, { status: 400 })
      const client = await prisma.client.findUnique({
        where: { id: data.clientId },
        select: { id: true, centerId: true },
      })
      if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
      if (isManager && client.centerId !== session!.user.centerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (mime !== 'application/pdf') {
        return NextResponse.json({ error: 'Le fichier doit être un PDF' }, { status: 400 })
      }
      path = `clients/${client.id}/mails/${randomUUID()}.pdf`
    }

    const signedUrl = await createUploadUrl(path)
    return NextResponse.json({ path, signedUrl, mime })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('[uploads/sign]', err)
    return NextResponse.json({ error: 'Impossible de préparer l’upload' }, { status: 500 })
  }
}
