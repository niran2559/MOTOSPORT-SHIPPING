const API_KEY = process.env.SHIPSGO_API_KEY!
const BASE_URL = process.env.SHIPSGO_BASE_URL || 'https://api.shipsgo.com/v2'

export interface ShipsGoOceanResult {
  trackingId: string
  status: string
  carrierName: string
  vesselName: string
  vesselImo: string
  originPort: string
  destinationPort: string
  departureDate: string | null
  etaDate: string | null
  currentPort: string | null
  events: ShipsGoEvent[]
  rawData: unknown
}

export interface ShipsGoEvent {
  date: string
  location: string
  description: string
  isCompleted: boolean
}

async function shipsgoFetch(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ShipsGo API error ${res.status}: ${text}`)
  }

  return res.json()
}

/**
 * מעקב אחר מכולה ימית
 * @param containerNumber - מספר מכולה (e.g. MSCU1234567)
 */
export async function trackOceanContainer(containerNumber: string): Promise<ShipsGoOceanResult> {
  const data = await shipsgoFetch('/ocean/tracking', {
    containerNumber: containerNumber.trim().toUpperCase(),
  })

  // Map ShipsGo response to our internal format
  // NOTE: עדכן mapping זה לפי response האמיתי מ-ShipsGo
  return {
    trackingId: containerNumber,
    status: mapOceanStatus(data.status),
    carrierName: data.carrier?.name ?? '',
    vesselName: data.vessel?.name ?? '',
    vesselImo: data.vessel?.imo ?? '',
    originPort: data.origin?.portName ?? '',
    destinationPort: data.destination?.portName ?? '',
    departureDate: data.departureDate ?? null,
    etaDate: data.eta ?? null,
    currentPort: data.currentPort?.portName ?? null,
    events: (data.events ?? []).map((e: any) => ({
      date: e.date,
      location: e.location,
      description: e.description,
      isCompleted: e.isCompleted ?? false,
    })),
    rawData: data,
  }
}

/**
 * המרת סטטוס ShipsGo לסטטוס פנימי
 */
function mapOceanStatus(apiStatus: string): string {
  const map: Record<string, string> = {
    AT_FACTORY: 'at_factory',
    TO_PORT: 'to_foreign_port',
    AT_PORT: 'at_foreign_port',
    ON_VESSEL: 'at_sea',
    AT_DESTINATION: 'at_local_port',
    DELIVERED: 'delivered',
  }
  return map[apiStatus?.toUpperCase()] ?? 'at_factory'
}

/**
 * בדיקת חריגה - האם ה-ETA השתנה
 */
export function detectException(
  etaOriginal: Date | null,
  etaCurrent: Date | null
): boolean {
  if (!etaOriginal || !etaCurrent) return false
  const diffMs = Math.abs(etaCurrent.getTime() - etaOriginal.getTime())
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours > 2 // חריגה אם ההפרש גדול מ-2 שעות
}
