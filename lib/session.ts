import { getServerSession as nextAuthGetServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from './auth'

const isBypassEnabled = () =>
  process.env.NODE_ENV !== 'production' && process.env.DEV_BYPASS_AUTH === '1'

const DEV_ADMIN_SESSION: Session = {
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Dev Admin',
    email: 'dev@local',
    role: 'admin',
    branchId: null,
    branchName: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
} as Session

export async function getSession(): Promise<Session | null> {
  if (isBypassEnabled()) {
    return DEV_ADMIN_SESSION
  }
  return nextAuthGetServerSession(authOptions)
}
