/**
 * Role levels
 */
export const RoleLevel = {
  member: 'member',
  admin: 'admin',
  system: 'system',
} as const;

/**
 * User role types
 */
export type UserRole = (typeof RoleLevel)[keyof typeof RoleLevel];
