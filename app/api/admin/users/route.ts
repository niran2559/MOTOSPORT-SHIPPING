import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { Permissions } from '@/lib/permissions'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'import_manager', 'agent']),
  branchId: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !Permissions.canManageUsers(session.user.role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await db.user.findMany({
    include: { branch: true },
    orderBy: { createdAt: 'desc' },
  })

  // Never return password hashes
  return NextResponse.json(
    users.map(({ passwordHash, ...u }) => u)
  )
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !Permissions.canManageUsers(session.user.role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = CreateUserSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { password, ...rest } = parsed.data
  const passwordHash = await bcrypt.hash(password, 10)

  const existing = await db.user.findUnique({ where: { email: rest.email } })
  if (existing) return NextResponse.json({ error: 'אימייל כבר קיים' }, { status: 409 })

  const user = await db.user.create({
    data: { ...rest, passwordHash },
    include: { branch: true },
  })

  const { passwordHash: _, ...safe } = user
  return NextResponse.json(safe, { status: 201 })
}
