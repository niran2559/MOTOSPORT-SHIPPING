import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { Permissions } from '@/lib/permissions'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const UpdateUserSchema = z.object({
  name:     z.string().min(2).max(100).optional(),
  email:    z.string().email().max(254).optional(),
  role:     z.enum(['admin', 'import_manager', 'agent']).optional(),
  branchId: z.string().uuid().nullable().optional(),
  password: z.string().min(8).max(128).optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !Permissions.canManageUsers(session.user.role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // IDOR: ודא שהמשתמש קיים לפני עדכון
  const target = await db.user.findUnique({ where: { id: params.id } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { password, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 12)
  }

  // מנהל לא יכול להוריד את עצמו מתפקיד admin
  if (params.id === session.user.id && rest.role && rest.role !== 'admin') {
    return NextResponse.json({ error: 'לא ניתן לשנות את התפקיד שלך' }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id: params.id },
    data,
    include: { branch: true },
  })

  const { passwordHash, ...safe } = updated
  return NextResponse.json(safe)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !Permissions.canManageUsers(session.user.role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // IDOR: ודא שהמשתמש קיים
  const target = await db.user.findUnique({ where: { id: params.id } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (params.id === session.user.id) {
    return NextResponse.json({ error: 'לא ניתן למחוק את המשתמש הנוכחי' }, { status: 400 })
  }

  await db.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
