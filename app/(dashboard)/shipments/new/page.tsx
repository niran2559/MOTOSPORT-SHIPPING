'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Branch { id: string; name: string }
interface OrderItem { sku: string; itemName: string; brand: string; category: string; quantity: number }
interface OrderDraft {
  orderNumber: string
  agencyName: string
  orderDate: string
  branchId: string
  quantityInShipment: string
  items: OrderItem[]
}

const EMPTY_ITEM: OrderItem = { sku: '', itemName: '', brand: '', category: '', quantity: 1 }
const EMPTY_ORDER: OrderDraft = {
  orderNumber: '', agencyName: '', orderDate: '', branchId: '', quantityInShipment: '', items: [{ ...EMPTY_ITEM }]
}

export default function NewShipmentPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState(1)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1 - Shipment info
  const [trackingId, setTrackingId] = useState('')
  const [description, setDescription] = useState('')
  const [carrierName, setCarrierName] = useState('')
  const [originPort, setOriginPort] = useState('')
  const [destinationPort, setDestinationPort] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [etaOriginal, setEtaOriginal] = useState('')

  // Step 2 - Orders
  const [orders, setOrders] = useState<OrderDraft[]>([{ ...EMPTY_ORDER }])

  // Step 3 - Branches
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/admin/branches').then((r) => r.json()).then(setBranches)
  }, [])

  async function handleLookup() {
    if (!trackingId.trim()) return
    setLookupLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(trackingId)}/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingId }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.carrierName) setCarrierName(data.carrierName)
        if (data.originPort) setOriginPort(data.originPort)
        if (data.destinationPort) setDestinationPort(data.destinationPort)
        if (data.etaDate) setEtaOriginal(data.etaDate.split('T')[0])
        if (data.departureDate) setDepartureDate(data.departureDate.split('T')[0])
      }
    } catch {
      setError('לא ניתן לאחזר נתונים מ-ShipsGo')
    } finally {
      setLookupLoading(false)
    }
  }

  // Order management
  function addOrder() { setOrders([...orders, { ...EMPTY_ORDER, items: [{ ...EMPTY_ITEM }] }]) }
  function removeOrder(i: number) { setOrders(orders.filter((_, idx) => idx !== i)) }
  function updateOrder(i: number, field: keyof OrderDraft, value: any) {
    setOrders(orders.map((o, idx) => idx === i ? { ...o, [field]: value } : o))
  }
  function addItem(oi: number) {
    setOrders(orders.map((o, idx) => idx === oi ? { ...o, items: [...o.items, { ...EMPTY_ITEM }] } : o))
  }
  function removeItem(oi: number, ii: number) {
    setOrders(orders.map((o, idx) => idx === oi ? { ...o, items: o.items.filter((_, i) => i !== ii) } : o))
  }
  function updateItem(oi: number, ii: number, field: keyof OrderItem, value: any) {
    setOrders(orders.map((o, oidx) =>
      oidx === oi ? { ...o, items: o.items.map((item, iidx) => iidx === ii ? { ...item, [field]: value } : item) } : o
    ))
  }

  async function handleSubmit() {
    if (!trackingId.trim()) { setError('מזהה משלוח נדרש'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/shipments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId: trackingId.trim().toUpperCase(),
        type: 'sea',
        description,
        carrierName,
        originPort,
        destinationPort,
        departureDate: departureDate || undefined,
        etaOriginal: etaOriginal || undefined,
        branchIds: selectedBranches,
        orders: orders
          .filter((o) => o.orderNumber.trim())
          .map((o) => ({
            orderNumber: o.orderNumber.trim(),
            agencyName: o.agencyName,
            orderDate: o.orderDate || undefined,
            branchId: o.branchId || undefined,
            quantityInShipment: o.quantityInShipment ? parseInt(o.quantityInShipment) : undefined,
            items: o.items.filter((item) => item.sku && item.itemName).map((item) => ({
              ...item,
              quantity: Number(item.quantity),
            })),
          })),
      }),
    })

    setLoading(false)

    if (res.ok) {
      const created = await res.json()
      router.push(`/shipments/${created.id}`)
    } else {
      const err = await res.json()
      setError(err.error ?? 'שגיאה בשמירה')
    }
  }

  const stepLabels = ['פרטי משלוח', 'הזמנות ופריטים', 'שיוך סניפים']

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Step indicators */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '32px' }}>
        {stepLabels.map((label, i) => {
          const n = i + 1
          const done = step > n
          const active = step === n
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: done ? 'pointer' : 'default',
                }}
                onClick={() => done && setStep(n)}
              >
                <div
                  style={{
                    width: 32, height: 32,
                    borderRadius: '50%',
                    background: done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--border)',
                    color: done || active ? '#fff' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                >
                  {done ? <span className="material-symbols-rounded icon-sm">check</span> : n}
                </div>
                <span style={{
                  fontSize: '14px', fontWeight: active ? 700 : 500,
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)'
                }}>
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div style={{ flex: 1, height: 2, background: done ? 'var(--success)' : 'var(--border)', margin: '0 12px', transition: 'background 0.2s' }} />
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--radius)',
          marginBottom: '20px', fontSize: '14px', display: 'flex', gap: '8px', alignItems: 'center'
        }}>
          <span className="material-symbols-rounded icon-sm">error</span>{error}
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="card fade-in">
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px' }}>פרטי המשלוח</h2>

          {/* Tracking lookup */}
          <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <label className="label">מספר מכולה / מזהה מעקב</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                className="input"
                placeholder="MSCU1234567"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                dir="ltr"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
              />
              <button
                className="btn btn-ghost"
                onClick={handleLookup}
                disabled={lookupLoading || !trackingId.trim()}
                style={{ flexShrink: 0 }}
              >
                {lookupLoading ? <span className="spinner" /> : (
                  <span className="material-symbols-rounded icon-sm">travel_explore</span>
                )}
                שאילתה מ-ShipsGo
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label className="label">תיאור (אופציונלי)</label>
              <input className="input" placeholder="תיאור כללי..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="label">חברת ספנות</label>
              <input className="input" placeholder="MSC, Maersk..." value={carrierName} onChange={(e) => setCarrierName(e.target.value)} />
            </div>
            <div>
              <label className="label">נמל מוצא</label>
              <input className="input" placeholder="Shanghai, Ningbo..." value={originPort} onChange={(e) => setOriginPort(e.target.value)} />
            </div>
            <div>
              <label className="label">נמל יעד</label>
              <input className="input" placeholder="Haifa, Ashdod..." value={destinationPort} onChange={(e) => setDestinationPort(e.target.value)} />
            </div>
            <div>
              <label className="label">תאריך יציאה</label>
              <input className="input" type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
            </div>
            <div>
              <label className="label">ETA (צפי הגעה)</label>
              <input className="input" type="date" value={etaOriginal} onChange={(e) => setEtaOriginal(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!trackingId.trim()}>
              הבא
              <span className="material-symbols-rounded icon-sm">arrow_back</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map((order, oi) => (
            <div key={oi} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>הזמנה #{oi + 1}</h3>
                {orders.length > 1 && (
                  <button className="btn btn-danger btn-sm" onClick={() => removeOrder(oi)}>
                    <span className="material-symbols-rounded icon-sm">delete</span>
                    הסר
                  </button>
                )}
              </div>

              <div className="form-grid" style={{ marginBottom: '16px' }}>
                <div>
                  <label className="label">מספר הזמנה *</label>
                  <input className="input" placeholder="PO-12345" value={order.orderNumber}
                    onChange={(e) => updateOrder(oi, 'orderNumber', e.target.value)} />
                </div>
                <div>
                  <label className="label">סוכנות</label>
                  <input className="input" placeholder="שם הסוכנות" value={order.agencyName}
                    onChange={(e) => updateOrder(oi, 'agencyName', e.target.value)} />
                </div>
                <div>
                  <label className="label">תאריך הזמנה</label>
                  <input className="input" type="date" value={order.orderDate}
                    onChange={(e) => updateOrder(oi, 'orderDate', e.target.value)} />
                </div>
                <div>
                  <label className="label">כמות במשלוח זה</label>
                  <input className="input" type="number" placeholder="כמות יחידות" value={order.quantityInShipment}
                    onChange={(e) => updateOrder(oi, 'quantityInShipment', e.target.value)} />
                </div>
              </div>

              {/* Items */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="label" style={{ marginBottom: 0 }}>פריטים</label>
                  <button className="btn btn-ghost btn-sm" onClick={() => addItem(oi)}>
                    <span className="material-symbols-rounded icon-sm">add</span>
                    הוסף פריט
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {order.items.map((item, ii) => (
                    <div key={ii} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 100px 70px 32px', gap: '8px', alignItems: 'center' }}>
                      <input className="input" placeholder='מק"ט' value={item.sku}
                        onChange={(e) => updateItem(oi, ii, 'sku', e.target.value)} style={{ fontSize: '13px' }} />
                      <input className="input" placeholder="שם פריט" value={item.itemName}
                        onChange={(e) => updateItem(oi, ii, 'itemName', e.target.value)} style={{ fontSize: '13px' }} />
                      <input className="input" placeholder="מותג" value={item.brand}
                        onChange={(e) => updateItem(oi, ii, 'brand', e.target.value)} style={{ fontSize: '13px' }} />
                      <input className="input" placeholder="קטגוריה" value={item.category}
                        onChange={(e) => updateItem(oi, ii, 'category', e.target.value)} style={{ fontSize: '13px' }} />
                      <input className="input" type="number" min="1" value={item.quantity}
                        onChange={(e) => updateItem(oi, ii, 'quantity', parseInt(e.target.value) || 1)}
                        style={{ fontSize: '13px', textAlign: 'center' }} />
                      {order.items.length > 1 && (
                        <button className="btn btn-icon btn-ghost" onClick={() => removeItem(oi, ii)}>
                          <span className="material-symbols-rounded icon-sm">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button className="btn btn-ghost" onClick={addOrder} style={{ alignSelf: 'flex-start' }}>
            <span className="material-symbols-rounded icon-sm">add_circle</span>
            הוסף הזמנה נוספת
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              <span className="material-symbols-rounded icon-sm">arrow_forward</span>
              חזרה
            </button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>
              הבא
              <span className="material-symbols-rounded icon-sm">arrow_back</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="card fade-in">
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>שיוך לסניפים</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
            בחר אילו סניפים יוכלו לצפות במשלוח זה
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {branches.map((branch) => {
              const checked = selectedBranches.includes(branch.id)
              return (
                <label
                  key={branch.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius)',
                    border: `1px solid ${checked ? 'rgba(249,115,22,0.4)' : 'var(--border)'}`,
                    background: checked ? 'var(--accent-glow)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSelectedBranches(
                        e.target.checked
                          ? [...selectedBranches, branch.id]
                          : selectedBranches.filter((id) => id !== branch.id)
                      )
                    }
                    style={{ display: 'none' }}
                  />
                  <div
                    style={{
                      width: 20, height: 20,
                      borderRadius: '4px',
                      border: `2px solid ${checked ? 'var(--accent)' : 'var(--border-light)'}`,
                      background: checked ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.15s',
                    }}
                  >
                    {checked && <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#fff' }}>check</span>}
                  </div>
                  <span className="material-symbols-rounded icon-sm" style={{ color: 'var(--text-muted)' }}>store</span>
                  <span style={{ fontWeight: 600 }}>{branch.name}</span>
                </label>
              )
            })}
          </div>

          {/* Summary */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '16px', marginBottom: '20px'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              סיכום
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>מזהה</span>
                <span className="mono" style={{ color: 'var(--accent)' }}>{trackingId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>הזמנות</span>
                <span>{orders.filter((o) => o.orderNumber.trim()).length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>סניפים</span>
                <span>{selectedBranches.length > 0 ? `${selectedBranches.length} נבחרו` : 'לא נבחרו'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>
              <span className="material-symbols-rounded icon-sm">arrow_forward</span>
              חזרה
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? <span className="spinner" /> : (
                <span className="material-symbols-rounded icon-sm">save</span>
              )}
              שמירת משלוח
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
