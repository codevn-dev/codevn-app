import { UserRole } from '@/types/shared/roles';

/**
 * Utility functions for role-based operations
 */

/**
 * Check if a user is an admin
 * @param role - User role
 * @returns True if user is admin
 */
export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'admin';
}

/**
 * Check if a user is a member
 * @param role - User role
 * @returns True if user is member
 */
export function isMember(role: UserRole | undefined): boolean {
  return role === 'member';
}

/**
 * Check if a user is a system user
 * @param role - User role
 * @returns True if user is system
 */
export function isSystem(role: UserRole | undefined): boolean {
  return role === 'system';
}

/**
 * Check if user has admin privileges
 * @param user - User object with role property
 * @returns True if user is admin
 */
export function hasAdminPrivileges(user: { role: UserRole | undefined }): boolean {
  return isAdmin(user.role);
}
