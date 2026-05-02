'use client'
import { SessionProvider as NextSessionProvider } from 'next-auth/react'
import { DEV_BYPASS_SESSION, isDevBypassClient } from '@/lib/dev-session'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const bypass = isDevBypassClient()
  return (
    <NextSessionProvider session={bypass ? DEV_BYPASS_SESSION : undefined}>
      {children}
    </NextSessionProvider>
  )
}
