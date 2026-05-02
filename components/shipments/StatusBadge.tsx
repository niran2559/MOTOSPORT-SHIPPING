export const STATUS_LABELS: Record<string, string> = {
  at_factory:      'במפעל',
  to_foreign_port: 'בדרך לנמל מוצא',
  at_foreign_port: 'בנמל מוצא',
  at_sea:          'בים',
  at_local_port:   'בנמל מקומי',
  delivered:       'נמסר',
}

export const STATUS_CLASS: Record<string, string> = {
  at_factory:      'badge badge-factory',
  to_foreign_port: 'badge badge-foreign',
  at_foreign_port: 'badge badge-foreign',
  at_sea:          'badge badge-sea',
  at_local_port:   'badge badge-port',
  delivered:       'badge badge-delivered',
}

export const STATUS_ICON: Record<string, string> = {
  at_factory:      'factory',
  to_foreign_port: 'directions_boat',
  at_foreign_port: 'anchor',
  at_sea:          'sailing',
  at_local_port:   'warehouse',
  delivered:       'check_circle',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={STATUS_CLASS[status] ?? 'badge badge-factory'}>
      <span className="material-symbols-rounded icon-sm">{STATUS_ICON[status] ?? 'help'}</span>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function formatDate(date: string | Date | null, withTime = false) {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}
