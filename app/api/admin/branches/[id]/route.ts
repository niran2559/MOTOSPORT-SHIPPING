import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { Permissions } from '@/lib/permissions'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !Permissions.canManageBranches(session.user.role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'שם סניף נדרש' }, { status: 400 })

  const branch = await db.branch.update({
    where: { id: params.id },
    data: { name: name.trim() },
  })
  return NextResponse.json(branch)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !Permissions.canManageBranches(session.user.role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // בדוק אם יש משתמשים משויכים
  const usersCount = await db.user.count({ where: { branchId: params.id } })
  if (usersCount > 0) {
    return NextResponse.json(
      { error: `לא ניתן למחוק סניף עם ${usersCount} משתמשים משויכים` },
      { status: 400 }
    )
  }

  await db.branch.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
