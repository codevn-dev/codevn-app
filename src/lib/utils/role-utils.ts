/**
 * Utility functions for role-based operations
 */

/**
 * Check if a user is an admin
 * @param role - User role
 * @returns True if user is admin
 */
export function isAdmin(role: string): boolean {
  return role === 'admin';
}

/**
 * Check if a user is a regular user
 * @param role - User role
 * @returns True if user is regular user
 */
export function isUser(role: string): boolean {
  return role === 'user';
}

/**
 * Check if user has admin privileges
 * @param user - User object with role property
 * @returns True if user is admin
 */
export function hasAdminPrivileges(user: { role: string }): boolean {
  return isAdmin(user.role);
}
