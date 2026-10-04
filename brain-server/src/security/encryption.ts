/**
 * Cryptographic Token Encryption & Key Management (AES-256-GCM)
 * Encrypts GitHub OAuth tokens and sensitive client secrets at rest.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const DEFAULT_SECRET = process.env.ENCRYPTION_SECRET || 'aibrain_master_encryption_key_2026_sinhala_english';

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}

export class TokenEncryption {
  private static getKey(secret?: string): Buffer {
    const raw = secret || DEFAULT_SECRET;
    return crypto.createHash('sha256').update(raw).digest();
  }

  /**
   * Encrypts plain text using AES-256-GCM with a random 12-byte IV
   */
  public static encrypt(plainText: string, secret?: string): EncryptedPayload {
    const key = this.getKey(secret);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let ciphertext = cipher.update(plainText, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag
    };
  }

  /**
   * Decrypts ciphertext with IV and authentication tag
   */
  public static decrypt(payload: EncryptedPayload, secret?: string): string {
    const key = this.getKey(secret);
    const iv = Buffer.from(payload.iv, 'hex');
    const tag = Buffer.from(payload.tag, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
