import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { Permissions } from '@/lib/permissions'
import { trackOceanContainer, detectException } from '@/lib/shipsgo'

// ========================
// GET /api/shipments/[id]
// ========================
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shipment = await db.shipment.findUnique({
    where: { id: params.id },
    include: {
      shipmentBranches: { include: { branch: true } },
      shipmentOrders: {
        include: { order: { include: { items: true, branch: true } } },
      },
      creator: { select: { name: true, email: true } },
    },
  })

  if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // בדיקת הרשאה לסוכן
  const role = session.user.role as any
  if (role === 'agent') {
    const hasAccess = shipment.shipmentBranches.some(
      (sb) => sb.branchId === session.user.branchId
    )
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(shipment)
}

// ========================
// PUT /api/shipments/[id]
// ========================
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role as any
  if (!Permissions.canEditShipment(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { branchIds, ...updateData } = body

  const shipment = await db.shipment.update({
    where: { id: params.id },
    data: {
      ...updateData,
      ...(updateData.etaOriginal ? { etaOriginal: new Date(updateData.etaOriginal) } : {}),
      ...(updateData.etaCurrent ? { etaCurrent: new Date(updateData.etaCurrent) } : {}),
      ...(updateData.departureDate ? { departureDate: new Date(updateData.departureDate) } : {}),
      // עדכון סניפים אם נשלחו
      ...(branchIds
        ? {
            shipmentBranches: {
              deleteMany: {},
              create: branchIds.map((id: string) => ({ branchId: id })),
            },
          }
        : {}),
    },
    include: {
      shipmentBranches: { include: { branch: true } },
    },
  })

  return NextResponse.json(shipment)
}

// ===========================
// DELETE /api/shipments/[id]
// ===========================
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role as any
  if (!Permissions.canDeleteShipment(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.shipment.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}

// =======================================
// POST /api/shipments/[id]/refresh
// שאילתה ידנית מול ShipsGo
// =======================================
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role as any
  if (!Permissions.canEditShipment(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const shipment = await db.shipment.findUnique({ where: { id: params.id } })
  if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const apiData = await trackOceanContainer(shipment.trackingId)
    const newEta = apiData.etaDate ? new Date(apiData.etaDate) : null
    const hasException = detectException(shipment.etaOriginal, newEta)

    const updated = await db.shipment.update({
      where: { id: params.id },
      data: {
        status: apiData.status as any,
        etaCurrent: newEta,
        hasException,
        carrierName: apiData.carrierName || shipment.carrierName,
        vesselId: apiData.vesselName || shipment.vesselId,
        rawApiData: apiData.rawData as any,
      },
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
