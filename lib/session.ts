import { getServerSession as nextAuthGetServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from './auth'
import { DEV_BYPASS_SESSION } from './dev-session'

/**
 * מחזיר את ה-session הנוכחי.
 * ה-bypass פעיל אך ורק כש:
 *   1. NODE_ENV === 'development'  (מונע פרודקשן לחלוטין ברמת הקוד)
 *   2. DEV_BYPASS_AUTH === '1'    (דורש הפעלה מפורשת ב-.env.local)
 * שני התנאים חייבים להתקיים יחד.
 */
function isBypassEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  if (process.env.NODE_ENV !== 'development') return false
  return process.env.DEV_BYPASS_AUTH?.trim() === '1'
}

export async function getSession(): Promise<Session | null> {
  if (isBypassEnabled()) {
    return DEV_BYPASS_SESSION
  }
  return nextAuthGetServerSession(authOptions)
}
