import type { Session } from 'next-auth'

/** סשן דמה לפיתוח — משותף ל-providers ול-layout כדי שלא יהיה מסך שחור לפני hydrate */
export const DEV_BYPASS_SESSION: Session = {
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

export function isDevBypassClient(): boolean {
  return process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH?.trim() === '1'
}
