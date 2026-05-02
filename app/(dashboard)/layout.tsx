'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { DEV_BYPASS_SESSION, isDevBypassClient } from '@/lib/dev-session'

const ROLE_LABELS: Record<string, string> = {
  admin: 'מנהל מערכת',
  import_manager: 'מנהל ייבוא',
  agent: 'סוכן',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const bypass = isDevBypassClient()
  const effectiveSession = bypass ? (session ?? DEV_BYPASS_SESSION) : session

  useEffect(() => {
    if (!bypass && status === 'unauthenticated') router.push('/login')
  }, [status, router, bypass])

  if (!bypass && status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  if (!effectiveSession) return null

  const role = effectiveSession.user.role
  const isAdmin = role === 'admin'
  const isManager = role === 'admin' || role === 'import_manager'

  const navItems = [
    { href: '/', icon: 'deployed_code', label: 'כל המשלוחים', always: true },
    { href: '/shipments/new', icon: 'add_circle', label: 'הוספת משלוח', show: isManager },
    { href: '/admin/users', icon: 'group', label: 'ניהול משתמשים', show: isAdmin },
    { href: '/admin/branches', icon: 'store', label: 'ניהול סניפים', show: isAdmin },
  ]

  return (
    <div>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: 'var(--accent)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px var(--accent-glow)',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-rounded" style={{ color: '#fff', fontSize: '18px' }}>
                local_shipping
              </span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                MOTOSPORT
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                SHIPPING
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems
            .filter((item) => item.always || item.show)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              >
                <span className="material-symbols-rounded icon-sm">{item.icon}</span>
                {item.label}
              </Link>
            ))}
        </nav>

        {/* User info */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: 'var(--bg-hover)',
              borderRadius: 'var(--radius)',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--accent-dim)',
                border: '2px solid var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--accent)',
              }}
            >
              {effectiveSession.user.name?.[0]}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {effectiveSession.user.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {ROLE_LABELS[role] ?? role}
                {effectiveSession.user.branchName && ` • ${effectiveSession.user.branchName}`}
              </div>
            </div>
          </div>

          <button
            className="nav-item"
            style={{ color: 'var(--danger)', width: '100%' }}
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <span className="material-symbols-rounded icon-sm">logout</span>
            יציאה
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-layout">
        {/* Topbar */}
        <header className="topbar">
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {navItems.find((n) => n.href === pathname)?.label ?? 'מערכת מעקב משלוחים'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {new Date().toLocaleDateString('he-IL')}
            </span>
          </div>
        </header>

        <div className="page-content fade-in">{children}</div>
      </main>
    </div>
  )
}
