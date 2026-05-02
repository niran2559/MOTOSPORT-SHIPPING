import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectException } from '@/lib/shipsgo'

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const body = await req.json()
  const { trackingId, event, newEta, status } = body

  if (!trackingId) return NextResponse.json({ error: 'Missing trackingId' }, { status: 400 })

  const shipment = await db.shipment.findUnique({ where: { trackingId } })
  if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })

  const newEtaDate = newEta ? new Date(newEta) : shipment.etaCurrent
  const hasException = detectException(shipment.etaOriginal, newEtaDate)

  await db.shipment.update({
    where: { id: shipment.id },
    data: {
      etaCurrent: newEtaDate,
      hasException,
      ...(status ? { status } : {}),
    },
  })

  console.log(`[Webhook] Updated shipment ${trackingId}, event: ${event}, exception: ${hasException}`)
  return NextResponse.json({ success: true })
}
