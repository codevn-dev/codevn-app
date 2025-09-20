/**
 * Masks email for privacy protection
 * @param email - The email to mask
 * @returns Masked email string
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  const maskedLocal = `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Masks email in user object for privacy
 * @param user - User object with email property
 * @returns User object with masked email
 */
export function maskUserEmail(user: { email: string; [key: string]: any }) {
  return {
    ...user,
    email: maskEmail(user.email),
  };
}
