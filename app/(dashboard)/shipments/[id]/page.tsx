'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { StatusBadge, STATUS_LABELS, STATUS_ICON, formatDate } from '@/components/shipments/StatusBadge'

const STEPS = [
  { key: 'at_factory', label: 'במפעל' },
  { key: 'to_foreign_port', label: 'בדרך לנמל מוצא' },
  { key: 'at_foreign_port', label: 'בנמל מוצא' },
  { key: 'at_sea', label: 'בים' },
  { key: 'at_local_port', label: 'בנמל מקומי' },
  { key: 'delivered', label: 'נמסר' },
]

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [shipment, setShipment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const isManager = session?.user.role === 'admin' || session?.user.role === 'import_manager'

  useEffect(() => {
    fetch(`/api/shipments/${id}`)
      .then((r) => {
        if (!r.ok) router.push('/')
        return r.json()
      })
      .then(setShipment)
      .finally(() => setLoading(false))
  }, [id, router])

  async function handleRefresh() {
    setRefreshing(true)
    const res = await fetch(`/api/shipments/${id}`, { method: 'PATCH' })
    if (res.ok) {
      const updated = await res.json()
      setShipment((prev: any) => ({ ...prev, ...updated }))
    }
    setRefreshing(false)
  }

  async function handleDelete() {
    if (!confirm('האם למחוק משלוח זה?')) return
    await fetch(`/api/shipments/${id}`, { method: 'DELETE' })
    router.push('/')
  }

  if (loading) {
    return (
      <div className="empty-state">
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }
  if (!shipment) return null

  const currentStepIdx = STEPS.findIndex((s) => s.key === shipment.status)

  return (
    <div>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={() => router.push('/')} style={{ marginBottom: '20px' }}>
        <span className="material-symbols-rounded icon-sm">arrow_forward</span>
        חזרה לרשימה
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="mono" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)' }}>
              {shipment.trackingId}
            </h1>
            <StatusBadge status={shipment.status} />
            {shipment.hasException && (
              <span className="badge badge-exception">
                <span className="material-symbols-rounded icon-sm">warning</span>
                חריגת ETA
              </span>
            )}
          </div>
          {shipment.description && (
            <p style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>{shipment.description}</p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {isManager && (
            <>
              <button
                className="btn btn-ghost"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? <span className="spinner" /> : (
                  <span className="material-symbols-rounded icon-sm">refresh</span>
                )}
                עדכון מ-ShipsGo
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <span className="material-symbols-rounded icon-sm">delete</span>
                מחיקה
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Shipment info */}
          <div className="card">
            <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              פרטי משלוח
            </h2>
            <div className="form-grid">
              {[
                { label: 'מספר מעקב', value: shipment.trackingId, mono: true },
                { label: 'ספק / חברת ספנות', value: shipment.carrierName },
                { label: 'אוניה / כלי שיט', value: shipment.vesselId },
                { label: 'תאריך יציאה', value: formatDate(shipment.departureDate) },
                { label: 'נמל מוצא', value: shipment.originPort },
                { label: 'נמל יעד', value: shipment.destinationPort },
                { label: 'ETA מקורי', value: formatDate(shipment.etaOriginal) },
                {
                  label: 'ETA עדכני',
                  value: formatDate(shipment.etaCurrent),
                  highlight: shipment.hasException,
                },
              ].map((f) => (
                <div key={f.label}>
                  <div className="label" style={{ marginBottom: '4px' }}>{f.label}</div>
                  <div
                    className={f.mono ? 'mono' : ''}
                    style={{
                      fontSize: '15px',
                      color: f.highlight ? 'var(--danger)' : 'var(--text-primary)',
                      fontWeight: f.highlight ? 700 : 400,
                    }}
                  >
                    {f.value ?? '—'}
                  </div>
                </div>
              ))}
            </div>

            {/* Branches */}
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div className="label" style={{ marginBottom: '8px' }}>סניפים</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {shipment.shipmentBranches?.map((sb: any) => (
                  <span key={sb.branchId} className="badge badge-factory">
                    <span className="material-symbols-rounded icon-sm">store</span>
                    {sb.branch.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Orders + Items */}
          {shipment.shipmentOrders?.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                הזמנות ופריטים
              </h2>
              {shipment.shipmentOrders.map((so: any) => (
                <div
                  key={so.orderId}
                  style={{
                    marginBottom: '20px',
                    paddingBottom: '20px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                        {so.order.orderNumber}
                      </span>
                      {so.order.agencyName && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px', marginRight: '8px' }}>
                          {so.order.agencyName}
                        </span>
                      )}
                    </div>
                    {so.quantityInShipment && (
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {so.quantityInShipment} יח&apos; במשלוח זה
                      </span>
                    )}
                  </div>

                  {so.order.items?.length > 0 && (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>מק&quot;ט</th>
                            <th>שם פריט</th>
                            <th>מותג</th>
                            <th>קטגוריה</th>
                            <th>כמות</th>
                          </tr>
                        </thead>
                        <tbody>
                          {so.order.items.map((item: any) => (
                            <tr key={item.id}>
                              <td className="mono" style={{ fontSize: '13px', color: 'var(--accent)' }}>{item.sku}</td>
                              <td>{item.itemName}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{item.brand ?? '—'}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{item.category ?? '—'}</td>
                              <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN – Timeline */}
        <div>
          <div className="card">
            <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ציר זמן
            </h2>
            <div className="timeline">
              {STEPS.map((step, idx) => {
                const isDone = idx < currentStepIdx
                const isActive = idx === currentStepIdx
                return (
                  <div key={step.key} className="timeline-item">
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className={`timeline-dot ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`} />
                      {idx < STEPS.length - 1 && <div className="timeline-line" />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: '4px' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'var(--accent)' : isDone ? 'var(--success)' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        <span className="material-symbols-rounded icon-sm">
                          {STATUS_ICON[step.key]}
                        </span>
                        {step.label}
                      </div>
                      {isActive && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          ETA: {formatDate(shipment.etaCurrent)}
                          {shipment.hasException && (
                            <span style={{ color: 'var(--danger)', marginRight: '6px' }}>
                              (שונה מ-{formatDate(shipment.etaOriginal)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Meta */}
          <div className="card" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'נוצר ע"י', value: shipment.creator?.name ?? '—' },
                { label: 'תאריך יצירה', value: formatDate(shipment.createdAt, true) },
                { label: 'עדכון אחרון', value: formatDate(shipment.updatedAt, true) },
              ].map((f) => (
                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{f.label}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
