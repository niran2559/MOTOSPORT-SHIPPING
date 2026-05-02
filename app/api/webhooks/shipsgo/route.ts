import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectException } from '@/lib/shipsgo'
import { createHmac, timingSafeEqual } from 'crypto'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { z } from 'zod'

const WebhookBodySchema = z.object({
  trackingId: z.string().min(1).max(100),
  event:      z.string().max(100).optional(),
  newEta:     z.string().datetime({ offset: true }).optional().nullable(),
  status:     z.enum(['at_factory', 'to_foreign_port', 'at_foreign_port', 'at_sea', 'at_local_port', 'delivered']).optional(),
})

/**
 * HMAC-SHA256 signature validation.
 * ShipsGo (או כל שולח webhook) צריך לשלוח:
 *   X-Webhook-Signature: sha256=<hex>
 * שם ה-hex הוא HMAC-SHA256 של גוף הבקשה עם WEBHOOK_SECRET.
 *
 * Fallback: אם ה-header לא קיים, עוברים לבדיקת plain secret (תאימות לאחור).
 */
async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.WEBHOOK_SECRET
  if (!secret) return false

  const signature = req.headers.get('x-webhook-signature')

  if (signature) {
    // HMAC validation
    if (!signature.startsWith('sha256=')) return false
    const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex')
    const expected = `sha256=${expectedHex}`

    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    } catch {
      return false
    }
  }

  // Fallback: plain secret header (backwards compat — הסר בגרסה הבאה)
  const plainSecret = req.headers.get('x-webhook-secret')
  if (!plainSecret) return false
  try {
    return timingSafeEqual(Buffer.from(plainSecret), Buffer.from(secret))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  // Rate limit: מקסימום 60 webhook-ים בדקה מאותה IP
  const ip = getClientIp(req)
  const rl = rateLimit(`webhook:${ip}`, { limit: 60, windowMs: 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const rawBody = await req.text()

  if (!(await verifySignature(req, rawBody))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let parsed: z.infer<typeof WebhookBodySchema>
  try {
    parsed = WebhookBodySchema.parse(JSON.parse(rawBody))
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { trackingId, event, newEta, status } = parsed

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

  console.log(`[Webhook] Updated shipment ${trackingId}, event: ${event ?? 'unknown'}, exception: ${hasException}`)
  return NextResponse.json({ success: true })
}
