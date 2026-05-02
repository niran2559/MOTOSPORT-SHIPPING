import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { Permissions } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !Permissions.canManageUsers(session.user.role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { password, ...rest } = body

  const data: any = { ...rest }
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10)
  }

  const user = await db.user.update({
    where: { id: params.id },
    data,
    include: { branch: true },
  })

  const { passwordHash, ...safe } = user
  return NextResponse.json(safe)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !Permissions.canManageUsers(session.user.role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // לא מוחקים את עצמנו
  if (params.id === session.user.id) {
    return NextResponse.json({ error: 'לא ניתן למחוק את המשתמש הנוכחי' }, { status: 400 })
  }

  await db.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
