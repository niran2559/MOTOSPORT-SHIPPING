'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      setError('אימייל או סיסמה שגויים')
    } else {
      router.push('/')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      {/* Background grid pattern */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          opacity: 0.3,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                background: 'var(--accent)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 24px var(--accent-glow)',
              }}
            >
              <span className="material-symbols-rounded icon-lg" style={{ color: '#fff' }}>
                local_shipping
              </span>
            </div>
            <div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: 'var(--text-primary)',
                }}
              >
                MOTOSPORT
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
                מעקב משלוחים
              </div>
            </div>
          </div>
        </div>

        {/* Login card */}
        <div className="card" style={{ boxShadow: 'var(--shadow)' }}>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              marginBottom: '24px',
              color: 'var(--text-primary)',
            }}
          >
            כניסה למערכת
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="label">אימייל</label>
              <input
                className="input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            <div>
              <label className="label">סיסמה</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: 'var(--danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span className="material-symbols-rounded icon-sm">error</span>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ marginTop: '8px', justifyContent: 'center', padding: '13px' }}
            >
              {loading ? <span className="spinner" /> : (
                <>
                  <span className="material-symbols-rounded icon-sm">login</span>
                  כניסה
                </>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
          גישה מורשית בלבד
        </p>
      </div>
    </div>
  )
}
