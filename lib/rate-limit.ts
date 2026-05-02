/**
 * Rate limiter in-memory פשוט — מתאים לפיתוח ו-single-instance.
 * לפרודקשן מרובה-שרתים: החלף ב-Upstash Redis (@upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// ניקוי ערכים פגי תוקף כל 5 דקות
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

export interface RateLimitOptions {
  /** מספר בקשות מקסימלי בחלון */
  limit: number
  /** גודל החלון במילישניות */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { allowed: true, remaining: opts.limit - 1, resetAt: now + opts.windowMs }
  }

  entry.count++
  const remaining = Math.max(0, opts.limit - entry.count)
  return { allowed: entry.count <= opts.limit, remaining, resetAt: entry.resetAt }
}

/** מחלץ IP מה-request (תואם Vercel / Next.js) */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}
