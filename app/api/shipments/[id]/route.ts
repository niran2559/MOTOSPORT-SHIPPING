import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { Permissions, canAccessShipment } from '@/lib/permissions'
import { trackOceanContainer, detectException } from '@/lib/shipsgo'
import { z } from 'zod'

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

  const branchIds = shipment.shipmentBranches.map((sb) => sb.branchId)
  if (!canAccessShipment(session, branchIds)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(shipment)
}

const UpdateShipmentSchema = z.object({
  trackingId:      z.string().min(1).max(100).optional(),
  type:            z.enum(['sea', 'air']).optional(),
  description:     z.string().max(500).optional().nullable(),
  carrierName:     z.string().max(200).optional().nullable(),
  vesselId:        z.string().max(200).optional().nullable(),
  originPort:      z.string().max(200).optional().nullable(),
  destinationPort: z.string().max(200).optional().nullable(),
  etaOriginal:     z.string().datetime({ offset: true }).optional().nullable(),
  etaCurrent:      z.string().datetime({ offset: true }).optional().nullable(),
  departureDate:   z.string().date().optional().nullable(),
  status:          z.enum(['at_factory', 'to_foreign_port', 'at_foreign_port', 'at_sea', 'at_local_port', 'delivered']).optional(),
  hasException:    z.boolean().optional(),
  branchIds:       z.array(z.string().uuid()).optional(),
})

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
  const parsed = UpdateShipmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { branchIds, etaOriginal, etaCurrent, departureDate, ...rest } = parsed.data

  const shipment = await db.shipment.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(etaOriginal !== undefined ? { etaOriginal: etaOriginal ? new Date(etaOriginal) : null } : {}),
      ...(etaCurrent  !== undefined ? { etaCurrent:  etaCurrent  ? new Date(etaCurrent)  : null } : {}),
      ...(departureDate !== undefined ? { departureDate: departureDate ? new Date(departureDate) : null } : {}),
      ...(branchIds
        ? { shipmentBranches: { deleteMany: {}, create: branchIds.map((id) => ({ branchId: id })) } }
        : {}),
    },
    include: { shipmentBranches: { include: { branch: true } } },
  })

  return NextResponse.json(shipment)
}

// ===========================
// DELETE /api/shipments/[id]
// ===========================
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!Permissions.canDeleteShipment(session.user.role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.shipment.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}

// ================================
// PATCH /api/shipments/[id]/refresh
// ================================
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!Permissions.canEditShipment(session.user.role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const shipment = await db.shipment.findUnique({ where: { id: params.id } })
  if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const apiData = await trackOceanContainer(shipment.trackingId)
    const newEta  = apiData.etaDate ? new Date(apiData.etaDate) : null
    const hasException = detectException(shipment.etaOriginal, newEta)

    const updated = await db.shipment.update({
      where: { id: params.id },
      data: {
        status:      apiData.status as any,
        etaCurrent:  newEta,
        hasException,
        carrierName: apiData.carrierName || shipment.carrierName,
        vesselId:    apiData.vesselName  || shipment.vesselId,
        rawApiData:  apiData.rawData as any,
      },
    })
    return NextResponse.json(updated)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
