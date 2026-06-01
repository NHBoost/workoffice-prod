import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/api-rate-limit'
import { parseSearchParams } from '@/lib/query-params'
import { audit } from '@/lib/audit'
import { hash } from 'bcryptjs'
import { z } from 'zod'

const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional().default(''),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
  role: z.enum(['all', 'ADMIN', 'MANAGER', 'USER']).default('all'),
})

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']),
  phone: z.string().optional(),
  centerId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = parseSearchParams(request, userListQuerySchema)
    if (parsed instanceof NextResponse) return parsed
    const { page, limit, search, status, role } = parsed

    const skip = (page - 1) * limit

    const where: any = {}

    // === Scope multi-tenant pour MANAGER ===
    // Un MANAGER ne voit QUE les users de son centre, ET jamais les ADMIN.
    // Un ADMIN voit tout.
    if (session.user.role === 'MANAGER') {
      if (!session.user.centerId) {
        // MANAGER sans centre = ne voit rien (cas pathologique)
        return NextResponse.json({ users: [], total: 0, pages: 0, currentPage: 1 })
      }
      where.centerId = session.user.centerId
      where.role = { not: 'ADMIN' }
    } else if (session.user.role !== 'ADMIN') {
      // Tout autre rôle (USER) ne devrait pas atteindre cet endpoint via middleware,
      // mais defense-in-depth
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status !== 'all') {
      where.isActive = status === 'active'
    }

    // Filtre role : MANAGER ne peut filtrer que parmi MANAGER/USER (ADMIN deja exclu)
    if (role !== 'all') {
      if (session.user.role === 'MANAGER' && role === 'ADMIN') {
        // MANAGER essaie de filtrer ADMIN -> on retourne vide
        return NextResponse.json({ users: [], total: 0, pages: 0, currentPage: 1 })
      }
      where.role = role
      if (session.user.role === 'MANAGER') {
        // re-applique le filtre anti-ADMIN si role={role} a écrasé where.role
        // (Prisma : on combine via AND implicite, mais on force pour clarté)
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          center: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      users,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit anti-spam : 10 creations / minute / IP
    const rl = await checkRateLimit(request, 'create_user', { max: 10, window: 60_000 })
    if (rl) return rl

    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create users
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // === Garde-fous role MANAGER ===
    if (session.user.role === 'MANAGER') {
      // MANAGER ne peut pas creer d'ADMIN
      if (validatedData.role === 'ADMIN') {
        return NextResponse.json(
          { error: 'Un manager ne peut pas créer de compte administrateur.' },
          { status: 403 }
        )
      }
      // MANAGER ne peut creer que dans SON centre — on force le centerId
      if (!session.user.centerId) {
        return NextResponse.json(
          { error: 'Votre compte manager n\'est rattaché à aucun centre.' },
          { status: 400 }
        )
      }
      // Si le manager a tente d'envoyer un autre centerId → on l'écrase
      validatedData.centerId = session.user.centerId
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        ...validatedData,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        center: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    // Audit : journal de la creation
    await audit('user.create', {
      actor: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      resourceType: 'User',
      resourceId: user.id,
      metadata: {
        createdEmail: user.email,
        createdRole: user.role,
        createdName: user.name,
      },
      request,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}