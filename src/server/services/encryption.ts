import * as crypto from 'crypto';
import { encryptionConfig } from '@/config/config';
import { EncryptedData } from '@/types/shared/encryption';
import { EncryptionError } from '@/types/shared/errors';

export class EncryptionService {
  private readonly key: Buffer;

  constructor() {
    // Derive a proper 32-byte key using PBKDF2 with config values
    this.key = crypto.pbkdf2Sync(
      encryptionConfig.key,
      encryptionConfig.salt,
      encryptionConfig.iterations,
      encryptionConfig.keyLength,
      encryptionConfig.algorithm as crypto.BinaryToTextEncoding
    );
  }

  /**
   * Encrypt a message using AES-256-GCM
   * @param plaintext - The message to encrypt
   * @returns Object containing encrypted text, IV, and authentication tag
   */
  encrypt(plaintext: string): EncryptedData {
    try {
      // Generate a random IV (Initialization Vector) for each encryption
      const iv = crypto.randomBytes(12); // 12 bytes for GCM mode

      // Create cipher with IV
      const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);

      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get the authentication tag
      const tag = cipher.getAuthTag();

      return {
        encryptedText: encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
      };
    } catch (error) {
      throw new Error(
        `${EncryptionError.ENCRYPTION_FAILED}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypt a message using AES-256-GCM
   * @param encryptedData - Object containing encrypted text, IV, and tag
   * @returns The decrypted plaintext message
   */
  decrypt(encryptedData: EncryptedData): string {
    try {
      // Convert IV and tag from Base64
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const tag = Buffer.from(encryptedData.tag, 'base64');

      // Create decipher with IV
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(tag);

      // Decrypt the ciphertext
      let decrypted = decipher.update(encryptedData.encryptedText, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(
        `${EncryptionError.DECRYPTION_FAILED}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Encrypt a message and return a combined string format
   * Format: base64(iv):base64(encryptedText):base64(tag)
   * @param plaintext - The message to encrypt
   * @returns Combined encrypted string
   */
  encryptToString(plaintext: string): string {
    const encrypted = this.encrypt(plaintext);
    return `${encrypted.iv}:${encrypted.encryptedText}:${encrypted.tag}`;
  }

  /**
   * Decrypt a message from combined string format
   * @param encryptedString - Combined encrypted string
   * @returns The decrypted plaintext message
   */
  decryptFromString(encryptedString: string): string {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      throw new Error(EncryptionError.INVALID_ENCRYPTED_FORMAT);
    }

    const encryptedData: EncryptedData = {
      iv: parts[0],
      encryptedText: parts[1],
      tag: parts[2],
    };

    return this.decrypt(encryptedData);
  }

  /**
   * Check if a string is encrypted (has the expected format)
   * @param text - The text to check
   * @returns True if the text appears to be encrypted
   */
  isEncrypted(text: string): boolean {
    const parts = text.split(':');
    return (
      parts.length === 3 &&
      parts.every((part) => {
        try {
          Buffer.from(part, 'base64');
          return true;
        } catch {
          return false;
        }
      })
    );
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
