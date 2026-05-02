'use client'
import { useState, useEffect } from 'react'
import { formatDate } from '@/components/shipments/StatusBadge'

const ROLE_LABELS: Record<string, string> = {
  admin: 'מנהל מערכת', import_manager: 'מנהל ייבוא', agent: 'סוכן'
}

interface User {
  id: string; name: string; email: string; role: string
  branchId: string | null; branch: { name: string } | null
  lastLoginAt: string | null; createdAt: string
}
interface Branch { id: string; name: string }

const EMPTY_FORM = { name: '', email: '', password: '', role: 'agent', branchId: '' }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const [u, b] = await Promise.all([
      fetch('/api/admin/users').then((r) => r.json()),
      fetch('/api/admin/branches').then((r) => r.json()),
    ])
    setUsers(u)
    setBranches(b)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditUser(null); setForm(EMPTY_FORM); setError(''); setShowModal(true)
  }
  function openEdit(u: User) {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, branchId: u.branchId ?? '' })
    setError(''); setShowModal(true)
  }

  async function handleSave() {
    setSaving(true); setError('')
    const method = editUser ? 'PUT' : 'POST'
    const url = editUser ? `/api/admin/users/${editUser.id}` : '/api/admin/users'
    const body: any = { name: form.name, email: form.email, role: form.role, branchId: form.branchId || null }
    if (form.password || !editUser) body.password = form.password

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { setShowModal(false); load() }
    else { const d = await res.json(); setError(d.error ?? 'שגיאה') }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`למחוק את ${name}?`)) return
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800 }}>ניהול משתמשים</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>{users.length} משתמשים</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <span className="material-symbols-rounded icon-sm">person_add</span>
          משתמש חדש
        </button>
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>שם</th><th>אימייל</th><th>תפקיד</th><th>סניף</th>
                <th>כניסה אחרונה</th><th>תאריך יצירה</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--accent-dim)', border: '2px solid var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0
                      }}>
                        {u.name[0]}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span className="badge badge-factory">{ROLE_LABELS[u.role]}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{u.branch?.name ?? '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{formatDate(u.lastLoginAt, true)}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{formatDate(u.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>
                        <span className="material-symbols-rounded icon-sm">edit</span>
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id, u.name)}>
                        <span className="material-symbols-rounded icon-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', fontWeight: 700 }}>
                {editUser ? `עריכת ${editUser.name}` : 'משתמש חדש'}
              </h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowModal(false)}>
                <span className="material-symbols-rounded icon-sm">close</span>
              </button>
            </div>
            <div className="modal-body">
              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius)',
                  fontSize: '14px', marginBottom: '16px'
                }}>{error}</div>
              )}
              <div className="form-grid">
                <div>
                  <label className="label">שם</label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">אימייל</label>
                  <input className="input" type="email" value={form.email} dir="ltr"
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">{editUser ? 'סיסמה חדשה (אופציונלי)' : 'סיסמה'}</label>
                  <input className="input" type="password" value={form.password} dir="ltr"
                    placeholder={editUser ? 'השאר ריק לאי-שינוי' : ''}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div>
                  <label className="label">תפקיד</label>
                  <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="agent">סוכן</option>
                    <option value="import_manager">מנהל ייבוא</option>
                    <option value="admin">מנהל מערכת</option>
                  </select>
                </div>
                <div className="span-2">
                  <label className="label">סניף</label>
                  <select className="input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                    <option value="">ללא שיוך</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>ביטול</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : <span className="material-symbols-rounded icon-sm">save</span>}
                שמירה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
