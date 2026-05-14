import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/api-auth'
import { sanitizeEmailHTML } from '@/lib/sanitize'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED']).optional(),
  scheduledAt: z.string().optional().nullable(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const campaign = await prisma.mailingCampaign.findUnique({
      where: { id: params.id },
      include: {
        recipients: { orderBy: { sentAt: 'desc' } },
      },
    })
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [opened, clicked, sent, total] = await Promise.all([
      prisma.mailingRecipient.count({ where: { campaignId: params.id, openedAt: { not: null } } }),
      prisma.mailingRecipient.count({ where: { campaignId: params.id, clickedAt: { not: null } } }),
      prisma.mailingRecipient.count({ where: { campaignId: params.id, sentAt: { not: null } } }),
      prisma.mailingRecipient.count({ where: { campaignId: params.id } }),
    ])

    return NextResponse.json({
      ...campaign,
      stats: { total, sent, opened, clicked },
    })
  } catch (err) {
    console.error('Error fetching campaign:', err)
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const updateData: any = { ...data }
    // Sanitize HTML cote serveur (defense-in-depth contre XSS stocke)
    if (data.content !== undefined) {
      updateData.content = sanitizeEmailHTML(data.content)
    }
    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null
    }

    // Si on passe à SENT, on simule l'envoi : marque les recipients comme envoyés
    if (data.status === 'SENT') {
      updateData.sentAt = new Date()
      await prisma.mailingRecipient.updateMany({
        where: { campaignId: params.id, sentAt: null },
        data: { sentAt: new Date() },
      })
    }

    const campaign = await prisma.mailingCampaign.update({
      where: { id: params.id },
      data: updateData,
    })
    return NextResponse.json(campaign)
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('Error updating campaign:', err)
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole('ADMIN')
  if (error) return error

  try {
    await prisma.mailingCampaign.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('Error deleting campaign:', err)
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}
