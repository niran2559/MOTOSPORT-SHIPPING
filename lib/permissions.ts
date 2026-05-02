import { Session } from 'next-auth'

export type UserRole = 'admin' | 'import_manager' | 'agent'

export const Permissions = {
  canViewAllShipments: (role: UserRole) => role === 'admin' || role === 'import_manager',
  canCreateShipment:   (role: UserRole) => role === 'admin' || role === 'import_manager',
  canEditShipment:     (role: UserRole) => role === 'admin' || role === 'import_manager',
  canDeleteShipment:   (role: UserRole) => role === 'admin' || role === 'import_manager',
  canAssignBranch:     (role: UserRole) => role === 'admin' || role === 'import_manager',
  canManageUsers:      (role: UserRole) => role === 'admin',
  canManageBranches:   (role: UserRole) => role === 'admin',
}

/**
 * בונה WHERE clause לפי הרשאות המשתמש.
 * - admin / import_manager: רואה הכל
 * - agent: רואה אך ורק משלוחים של הסניף שלו
 *   אם לסוכן אין סניף — לא מוצג כלום (WHERE שגוי=FALSE)
 */
export function getShipmentFilter(session: Session) {
  const role = session.user.role as UserRole
  if (role === 'admin' || role === 'import_manager') return {}

  const branchId = session.user.branchId
  if (!branchId) {
    // סוכן ללא סניף — אין גישה לשום משלוח
    return { id: '' }
  }

  return {
    shipmentBranches: { some: { branchId } },
  }
}

/**
 * בדיקת גישה לסוכן למשלוח ספציפי.
 * מחזיר true אם המשתמש רשאי לצפות במשלוח.
 */
export function canAccessShipment(
  session: Session,
  shipmentBranchIds: string[]
): boolean {
  const role = session.user.role as UserRole
  if (role === 'admin' || role === 'import_manager') return true

  const branchId = session.user.branchId
  if (!branchId) return false

  return shipmentBranchIds.includes(branchId)
}
