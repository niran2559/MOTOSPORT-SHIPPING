import { Session } from 'next-auth'

export type UserRole = 'admin' | 'import_manager' | 'agent'

export const Permissions = {
  canViewAllShipments: (role: UserRole) => role === 'admin' || role === 'import_manager',
  canCreateShipment: (role: UserRole) => role === 'admin' || role === 'import_manager',
  canEditShipment: (role: UserRole) => role === 'admin' || role === 'import_manager',
  canDeleteShipment: (role: UserRole) => role === 'admin' || role === 'import_manager',
  canAssignBranch: (role: UserRole) => role === 'admin' || role === 'import_manager',
  canManageUsers: (role: UserRole) => role === 'admin',
  canManageBranches: (role: UserRole) => role === 'admin',
}

/**
 * בונה WHERE clause לפי הרשאות המשתמש
 * סוכן רואה רק משלוחים של הסניף שלו
 */
export function getShipmentFilter(session: Session) {
  const role = session.user.role as UserRole
  if (role === 'admin' || role === 'import_manager') {
    return {} // מנהל רואה הכל
  }
  // סוכן רואה רק לפי סניף
  return {
    shipmentBranches: {
      some: { branchId: session.user.branchId ?? '' },
    },
  }
}
