'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { StatusBadge, formatDate } from '@/components/shipments/StatusBadge'
import { DEV_BYPASS_SESSION, isDevBypassClient } from '@/lib/dev-session'

interface Shipment {
  id: string
  trackingId: string
  type: string
  description: string | null
  status: string
  carrierName: string | null
  originPort: string | null
  destinationPort: string | null
  etaOriginal: string | null
  etaCurrent: string | null
  hasException: boolean
  shipmentBranches: { branch: { id: string; name: string } }[]
  shipmentOrders: { order: { orderNumber: string } }[]
}

const STATUS_OPTIONS = [
  { value: '', label: 'כל הסטטוסים' },
  { value: 'at_factory', label: 'במפעל' },
  { value: 'to_foreign_port', label: 'בדרך לנמל מוצא' },
  { value: 'at_foreign_port', label: 'בנמל מוצא' },
  { value: 'at_sea', label: 'בים' },
  { value: 'at_local_port', label: 'בנמל מקומי' },
  { value: 'delivered', label: 'נמסר' },
]

export default function HomePage() {
  const { data: session } = useSession()
  const activeSession = isDevBypassClient() ? (session ?? DEV_BYPASS_SESSION) : session
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [exceptionsOnly, setExceptionsOnly] = useState(false)
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [branchFilter, setBranchFilter] = useState('')

  const isManager =
    activeSession?.user.role === 'admin' || activeSession?.user.role === 'import_manager'

  const fetchShipments = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
      ...(exceptionsOnly ? { exceptions: 'true' } : {}),
      ...(branchFilter ? { branchId: branchFilter } : {}),
      limit: '100',
    })
    const res = await fetch(`/api/shipments?${params}`)
    const data = await res.json()
    setShipments(data.data ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [search, status, exceptionsOnly, branchFilter])

  useEffect(() => {
    fetchShipments()
  }, [fetchShipments])

  useEffect(() => {
    if (isManager) {
      fetch('/api/admin/branches').then((r) => r.json()).then(setBranches)
    }
  }, [isManager])

  const exceptions = shipments.filter((s) => s.hasException).length

  return (
    <div>
      {/* Stats bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {[
          { label: 'סה"כ משלוחים', value: total, icon: 'inventory_2', color: 'var(--text-secondary)' },
          { label: 'בים כעת', value: shipments.filter((s) => s.status === 'at_sea').length, icon: 'sailing', color: 'var(--info)' },
          { label: 'בנמל מקומי', value: shipments.filter((s) => s.status === 'at_local_port').length, icon: 'warehouse', color: 'var(--warning)' },
          { label: 'חריגות', value: exceptions, icon: 'warning', color: 'var(--danger)' },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: stat.color }}>{stat.icon}</span>
              {stat.label === 'חריגות' && stat.value > 0 && <span className="exception-dot" />}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1, color: stat.color === 'var(--danger)' && stat.value > 0 ? stat.color : 'var(--text-primary)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{ padding: '16px 20px', marginBottom: '20px' }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <span
              className="material-symbols-rounded icon-sm"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            >
              search
            </span>
            <input
              className="input"
              placeholder="חיפוש לפי מזהה, נמל, ספק..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingRight: '38px' }}
            />
          </div>

          {/* Status filter */}
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: 'auto', cursor: 'pointer' }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Branch filter (manager+) */}
          {isManager && branches.length > 0 && (
            <select
              className="input"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              style={{ width: 'auto', cursor: 'pointer' }}
            >
              <option value="">כל הסניפים</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          {/* Exceptions toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              background: exceptionsOnly ? 'rgba(239,68,68,0.1)' : 'transparent',
              border: `1px solid ${exceptionsOnly ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
              color: exceptionsOnly ? 'var(--danger)' : 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            <input
              type="checkbox"
              checked={exceptionsOnly}
              onChange={(e) => setExceptionsOnly(e.target.checked)}
              style={{ display: 'none' }}
            />
            <span className="material-symbols-rounded icon-sm">warning</span>
            חריגות בלבד
            {exceptions > 0 && (
              <span
                style={{
                  background: 'var(--danger)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '0 6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  minWidth: '18px',
                  textAlign: 'center',
                }}
              >
                {exceptions}
              </span>
            )}
          </label>

          {isManager && (
            <Link href="/shipments/new" className="btn btn-primary" style={{ marginRight: 'auto' }}>
              <span className="material-symbols-rounded icon-sm">add</span>
              משלוח חדש
            </Link>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 32, height: 32 }} />
            <span>טוען נתונים...</span>
          </div>
        ) : shipments.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-rounded">inventory_2</span>
            <span>לא נמצאו משלוחים</span>
            {isManager && (
              <Link href="/shipments/new" className="btn btn-primary btn-sm" style={{ marginTop: '8px' }}>
                <span className="material-symbols-rounded icon-sm">add</span>
                הוסף משלוח ראשון
              </Link>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 24 }}></th>
                <th>מזהה מכולה</th>
                <th>ספק</th>
                <th>מוצא → יעד</th>
                <th>ETA מקורי</th>
                <th>ETA עדכני</th>
                <th>סטטוס</th>
                <th>סניפים</th>
                <th>הזמנות</th>
                <th className="ltr"></th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} className={s.hasException ? 'has-exception' : ''}>
                  {/* Exception indicator */}
                  <td style={{ textAlign: 'center', padding: '14px 8px' }}>
                    {s.hasException && <span className="exception-dot" title="חריגת ETA" />}
                  </td>

                  {/* Tracking ID */}
                  <td>
                    <span className="mono" style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>
                      {s.trackingId}
                    </span>
                    {s.description && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {s.description}
                      </div>
                    )}
                  </td>

                  {/* Carrier */}
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {s.carrierName ?? '—'}
                  </td>

                  {/* Ports */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <span>{s.originPort ?? '—'}</span>
                      <span className="material-symbols-rounded icon-sm" style={{ color: 'var(--text-muted)' }}>
                        arrow_back
                      </span>
                      <span>{s.destinationPort ?? '—'}</span>
                    </div>
                  </td>

                  {/* ETA Original */}
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {formatDate(s.etaOriginal)}
                  </td>

                  {/* ETA Current */}
                  <td>
                    <span
                      className="mono"
                      style={{
                        fontSize: '13px',
                        color: s.hasException ? 'var(--danger)' : 'var(--text-primary)',
                        fontWeight: s.hasException ? 700 : 400,
                      }}
                    >
                      {formatDate(s.etaCurrent)}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <StatusBadge status={s.status} />
                  </td>

                  {/* Branches */}
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {s.shipmentBranches.map((sb) => (
                        <span
                          key={sb.branch.id}
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {sb.branch.name}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Orders count */}
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {s.shipmentOrders.length > 0 ? (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {s.shipmentOrders.length} הזמנות
                      </span>
                    ) : '—'}
                  </td>

                  {/* Actions */}
                  <td>
                    <Link
                      href={`/shipments/${s.id}`}
                      className="btn btn-ghost btn-sm"
                    >
                      <span className="material-symbols-rounded icon-sm">open_in_new</span>
                      פרטים
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && shipments.length > 0 && (
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'left' }}>
          מציג {shipments.length} מתוך {total} משלוחים
        </div>
      )}
    </div>
  )
}
