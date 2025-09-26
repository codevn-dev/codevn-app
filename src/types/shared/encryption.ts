/**
 * Encryption-related types and interfaces
 */

export interface EncryptedData {
  encryptedText: string;
  iv: string;
  tag: string;
}
