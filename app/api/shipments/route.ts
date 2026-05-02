import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { getShipmentFilter, Permissions } from '@/lib/permissions'
import { z } from 'zod'

// ==================
// GET /api/shipments
// ==================
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const exceptionsOnly = searchParams.get('exceptions') === 'true'
  const branchId = searchParams.get('branchId') ?? ''

  const role = session.user.role as any
  const branchFilter = getShipmentFilter(session)

  const where: any = {
    ...branchFilter,
    ...(exceptionsOnly ? { hasException: true } : {}),
    ...(status ? { status } : {}),
    ...(branchId && Permissions.canViewAllShipments(role)
      ? { shipmentBranches: { some: { branchId } } }
      : {}),
    ...(search
      ? {
          OR: [
            { trackingId: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { carrierName: { contains: search, mode: 'insensitive' } },
            { originPort: { contains: search, mode: 'insensitive' } },
            { destinationPort: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [shipments, total] = await Promise.all([
    db.shipment.findMany({
      where,
      include: {
        shipmentBranches: { include: { branch: true } },
        shipmentOrders: {
          include: {
            order: { include: { items: true } },
          },
        },
        creator: { select: { name: true } },
      },
      orderBy: [{ hasException: 'desc' }, { etaCurrent: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.shipment.count({ where }),
  ])

  return NextResponse.json({
    data: shipments,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}

// ===================
// POST /api/shipments
// ===================
const CreateShipmentSchema = z.object({
  trackingId: z.string().min(1),
  type: z.enum(['sea', 'air']).default('sea'),
  description: z.string().optional(),
  carrierName: z.string().optional(),
  originPort: z.string().optional(),
  destinationPort: z.string().optional(),
  departureDate: z.string().optional(),
  etaOriginal: z.string().optional(),
  branchIds: z.array(z.string()).default([]),
  orders: z
    .array(
      z.object({
        orderNumber: z.string(),
        agencyName: z.string().optional(),
        category: z.string().optional(),
        orderDate: z.string().optional(),
        branchId: z.string().optional(),
        quantityInShipment: z.number().optional(),
        items: z.array(
          z.object({
            sku: z.string(),
            itemName: z.string(),
            category: z.string().optional(),
            brand: z.string().optional(),
            quantity: z.number().default(1),
          })
        ).default([]),
      })
    )
    .default([]),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role as any
  if (!Permissions.canCreateShipment(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = CreateShipmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { trackingId, branchIds, orders, etaOriginal, departureDate, ...rest } = parsed.data

  // Check if tracking ID already exists
  const existing = await db.shipment.findUnique({ where: { trackingId } })
  if (existing) {
    return NextResponse.json({ error: 'מספר מעקב כבר קיים במערכת' }, { status: 409 })
  }

  const shipment = await db.shipment.create({
    data: {
      trackingId,
      ...rest,
      etaOriginal: etaOriginal ? new Date(etaOriginal) : null,
      etaCurrent: etaOriginal ? new Date(etaOriginal) : null,
      departureDate: departureDate ? new Date(departureDate) : null,
      createdBy: session.user.id,
      // שיוך לסניפים
      shipmentBranches: {
        create: branchIds.map((branchId) => ({ branchId })),
      },
      // יצירת הזמנות ופריטים
      shipmentOrders: {
        create: await Promise.all(
          orders.map(async (order) => {
            // יצירת Order אם לא קיים
            const existingOrder = await db.order.findUnique({
              where: { orderNumber: order.orderNumber },
            })

            if (!existingOrder) {
              await db.order.create({
                data: {
                  orderNumber: order.orderNumber,
                  agencyName: order.agencyName,
                  category: order.category,
                  orderDate: order.orderDate ? new Date(order.orderDate) : null,
                  branchId: order.branchId,
                  items: { create: order.items },
                },
              })
            }

            return {
              order: { connect: { orderNumber: order.orderNumber } },
              quantityInShipment: order.quantityInShipment,
            }
          })
        ),
      },
    },
    include: {
      shipmentBranches: { include: { branch: true } },
      shipmentOrders: { include: { order: { include: { items: true } } } },
    },
  })

  return NextResponse.json(shipment, { status: 201 })
}
