/**
 * User role types
 */
export type UserRole = 'member' | 'admin' | 'system';

/**
 * Role hierarchy levels (higher number = more privileges)
 */
export const ROLE_HIERARCHY = {
  member: 1,
  admin: 2,
  system: 3,
} as const;

/**
 * Check if a role has sufficient privileges
 */
export function hasRolePrivilege(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
