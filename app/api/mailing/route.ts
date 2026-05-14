import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/api-auth'
import { sanitizeEmailHTML } from '@/lib/sanitize'
import { z } from 'zod'

const recipientSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
})

const campaignSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  subject: z.string().min(1, 'Sujet requis'),
  content: z.string().min(1, 'Contenu requis'),
  targetType: z.enum(['ALL', 'ACTIVE_ENTERPRISES', 'CUSTOM']).default('CUSTOM'),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENT']).default('DRAFT'),
  scheduledAt: z.string().optional(),
  recipients: z.array(recipientSchema).default([]),
})

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const campaigns = await prisma.mailingCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { recipients: true } },
      },
    })

    // Calcul des taux d'ouverture/clic en parallèle (top niveau)
    const enriched = await Promise.all(
      campaigns.map(async c => {
        const [opened, clicked, sent] = await Promise.all([
          prisma.mailingRecipient.count({ where: { campaignId: c.id, openedAt: { not: null } } }),
          prisma.mailingRecipient.count({ where: { campaignId: c.id, clickedAt: { not: null } } }),
          prisma.mailingRecipient.count({ where: { campaignId: c.id, sentAt: { not: null } } }),
        ])
        return { ...c, openedCount: opened, clickedCount: clicked, sentCount: sent }
      })
    )

    return NextResponse.json({ campaigns: enriched, total: enriched.length })
  } catch (err) {
    console.error('Error fetching campaigns:', err)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const body = await request.json()
    const data = campaignSchema.parse(body)

    const campaign = await prisma.mailingCampaign.create({
      data: {
        name: data.name,
        subject: data.subject,
        content: sanitizeEmailHTML(data.content),
        targetType: data.targetType,
        status: data.status,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        recipients: {
          create: data.recipients.map(r => ({ email: r.email, name: r.name || null })),
        },
      },
      include: { _count: { select: { recipients: true } } },
    })
    return NextResponse.json(campaign, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('Error creating campaign:', err)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}
