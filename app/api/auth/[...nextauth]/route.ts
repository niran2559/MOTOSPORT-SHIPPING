import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const nextAuthHandler = NextAuth(authOptions)

async function handler(req: NextRequest, ctx: any) {
  // Rate limit רק על POST (ניסיונות login)
  if (req.method === 'POST') {
    const ip = getClientIp(req)
    const result = rateLimit(`auth:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 })

    if (!result.allowed) {
      return NextResponse.json(
        { error: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }
  }

  return nextAuthHandler(req as any, ctx)
}

export { handler as GET, handler as POST }
