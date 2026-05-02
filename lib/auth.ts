import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from './db'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 }, // 24 hours
  pages: { signIn: '/login' },

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email.trim()
        const password = credentials.password

        try {
          const user = await db.user.findFirst({
            where: {
              email: { equals: email, mode: 'insensitive' },
            },
            include: { branch: true },
          })

          if (!user) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[auth] אין משתמש עם האימייל:', email)
            }
            return null
          }

          const passwordMatch = await bcrypt.compare(password, user.passwordHash)
          if (!passwordMatch) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[auth] סיסמה לא תואמת למשתמש:', user.email)
            }
            return null
          }

          try {
            await db.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            })
          } catch (e) {
            console.error('[auth] עדכון lastLoginAt נכשל (המשתמש יוכנס בכל זאת)', e)
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            branchId: user.branchId,
            branchName: user.branch?.name ?? null,
          }
        } catch (e) {
          console.error('[auth] שגיאת מסד בהתחברות:', e)
          throw e
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.branchId = (user as any).branchId
        token.branchName = (user as any).branchName
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.branchId = token.branchId as string | null
      session.user.branchName = token.branchName as string | null
      return session
    },
  },
}
