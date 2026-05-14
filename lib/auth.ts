import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import { compare } from 'bcryptjs'
import { rateLimit } from './rate-limit'

/**
 * Anti brute-force config :
 *  - 5 tentatives ratees consecutives → compte verrouille 15 min
 *  - 20 tentatives par IP par minute → rejet immediat (multi-comptes)
 *  - Reset du compteur au succes du login
 */
const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60_000 // 15 min
const IP_MAX_PER_MIN = 20

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'email@example.com',
        },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.toLowerCase().trim()

        // === Defense 1 : rate-limit par IP (court terme, anti-flood) ===
        const ip =
          (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          (req?.headers?.['x-real-ip'] as string) ||
          'anonymous'
        const ipCheck = rateLimit(`login:ip:${ip}`, { max: IP_MAX_PER_MIN, window: 60_000 })
        if (!ipCheck.allowed) {
          // Throw → NextAuth retourne une erreur generique au client
          throw new Error('Too many requests, please retry later.')
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { center: true },
        })

        if (!user || !user.password) {
          // Pas d'enumeration : meme delai bcrypt qu'un mot de passe rate
          await compare(credentials.password, '$2a$12$abcdefghijklmnopqrstuv1234567890abcdefghijklmnop')
          return null
        }

        // === Defense 2 : compte verrouille en BDD ? ===
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error('Account locked, please retry later or reset password.')
        }

        if (!user.isActive) {
          return null
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          // Increment du compteur + lock si seuil atteint
          const nextAttempts = user.failedLoginAttempts + 1
          const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: nextAttempts,
              lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
            },
          })
          return null
        }

        // === Succes : reset des compteurs + log de la connexion ===
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          centerId: user.centerId ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.centerId = (user as any).centerId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.centerId = token.centerId as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
  },
}