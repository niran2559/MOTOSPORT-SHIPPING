import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { Permissions } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const branches = await db.branch.findMany({
    include: { _count: { select: { users: true, orders: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(branches)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !Permissions.canManageBranches(session.user.role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name } = body
  if (!name || typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return NextResponse.json({ error: 'שם סניף נדרש (מקסימום 100 תווים)' }, { status: 400 })
  }

  const branch = await db.branch.create({ data: { name: name.trim() } })
  return NextResponse.json(branch, { status: 201 })
}
