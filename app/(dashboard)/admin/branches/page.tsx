'use client'
import { useState, useEffect } from 'react'

interface Branch { id: string; name: string; createdAt: string; _count: { users: number; orders: number } }

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/branches')
    const data = await res.json()
    setBranches(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openCreate() { setEditBranch(null); setName(''); setError(''); setShowModal(true) }
  function openEdit(b: Branch) { setEditBranch(b); setName(b.name); setError(''); setShowModal(true) }

  async function handleSave() {
    setSaving(true); setError('')
    const method = editBranch ? 'PUT' : 'POST'
    const url = editBranch ? `/api/admin/branches/${editBranch.id}` : '/api/admin/branches'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    setSaving(false)
    if (res.ok) { setShowModal(false); load() }
    else { const d = await res.json(); setError(d.error ?? 'שגיאה') }
  }

  async function handleDelete(id: string, branchName: string) {
    if (!confirm(`למחוק את ${branchName}?`)) return
    const res = await fetch(`/api/admin/branches/${id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json(); alert(d.error) }
    else load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800 }}>ניהול סניפים</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>{branches.length} סניפים</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <span className="material-symbols-rounded icon-sm">add_business</span>
          סניף חדש
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {branches.map((b) => (
            <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '10px',
                    background: 'var(--accent-glow)', border: '1px solid rgba(249,115,22,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-rounded" style={{ color: 'var(--accent)' }}>store</span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{b.name}</h3>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-icon btn-ghost" onClick={() => openEdit(b)}>
                    <span className="material-symbols-rounded icon-sm">edit</span>
                  </button>
                  <button className="btn btn-icon btn-danger" onClick={() => handleDelete(b.id, b.name)}>
                    <span className="material-symbols-rounded icon-sm">delete</span>
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>{b._count.users}</span>
                  משתמשים
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>{b._count.orders}</span>
                  הזמנות
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', fontWeight: 700 }}>{editBranch ? 'עריכת סניף' : 'סניף חדש'}</h2>
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
              <label className="label">שם הסניף</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: סניף תל אביב" onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>ביטול</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
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
