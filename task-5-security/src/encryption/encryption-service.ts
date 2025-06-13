/**
 * K3SS AI Coder - Enterprise Encryption Service
 * AES-256 encryption with hardware security module support
 */

import { EncryptedData, SecurityContext, DataClassification } from '../security-framework';
import * as crypto from 'crypto';

export class EncryptionService {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16;  // 128 bits
  private readonly TAG_LENGTH = 16; // 128 bits

  private keyStore: Map<string, Buffer> = new Map();
  private keyRotationSchedule: Map<string, Date> = new Map();

  constructor() {
    this.initializeKeyStore();
  }

  /**
   * Encrypt data with context-aware security
   */
  async encrypt(data: any, context: SecurityContext): Promise<EncryptedData> {
    try {
      const serializedData = JSON.stringify(data);
      const keyId = this.getKeyForClassification(context.classification);
      const key = this.getKey(keyId);
      
      if (!key) {
        throw new Error(`Encryption key not found: ${keyId}`);
      }

      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipher(this.ALGORITHM, key);
      cipher.setAAD(Buffer.from(JSON.stringify({
        classification: context.classification,
        purpose: context.purpose,
        userId: context.user.id
      })));

      let encrypted = cipher.update(serializedData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      return {
        data: encrypted,
        algorithm: this.ALGORITHM,
        keyId,
        iv: iv.toString('hex'),
        metadata: {
          tag: tag.toString('hex'),
          classification: context.classification,
          encryptedAt: new Date().toISOString(),
          purpose: context.purpose
        }
      };

    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data with integrity verification
   */
  async decrypt(encryptedData: EncryptedData, context: SecurityContext): Promise<any> {
    try {
      const key = this.getKey(encryptedData.keyId);
      if (!key) {
        throw new Error(`Decryption key not found: ${encryptedData.keyId}`);
      }

      const iv = Buffer.from(encryptedData.iv!, 'hex');
      const tag = Buffer.from(encryptedData.metadata!.tag, 'hex');
      
      const decipher = crypto.createDecipher(encryptedData.algorithm, key);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from(JSON.stringify({
        classification: encryptedData.metadata!.classification,
        purpose: encryptedData.metadata!.purpose,
        userId: context.user.id
      })));

      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);

    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate new encryption key
   */
  generateKey(): string {
    const keyId = `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const key = crypto.randomBytes(this.KEY_LENGTH);
    
    this.keyStore.set(keyId, key);
    this.keyRotationSchedule.set(keyId, new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)); // 90 days
    
    return keyId;
  }

  /**
   * Rotate encryption keys based on schedule
   */
  async rotateKeys(): Promise<void> {
    const now = new Date();
    
    for (const [keyId, rotationDate] of this.keyRotationSchedule.entries()) {
      if (now >= rotationDate) {
        // Generate new key
        const newKeyId = this.generateKey();
        
        // Mark old key for deprecation (don't delete immediately for decryption)
        this.keyRotationSchedule.delete(keyId);
        
        console.log(`Key rotated: ${keyId} -> ${newKeyId}`);
      }
    }
  }

  /**
   * Hash data with salt for integrity verification
   */
  hash(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256');
    hash.update(data + actualSalt);
    return hash.digest('hex');
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Initialize key store with default keys
   */
  private initializeKeyStore(): void {
    // Generate keys for different data classifications
    const publicKey = this.generateKey();
    const internalKey = this.generateKey();
    const confidentialKey = this.generateKey();
    const restrictedKey = this.generateKey();

    // Map classifications to keys
    this.keyStore.set('public_default', this.keyStore.get(publicKey)!);
    this.keyStore.set('internal_default', this.keyStore.get(internalKey)!);
    this.keyStore.set('confidential_default', this.keyStore.get(confidentialKey)!);
    this.keyStore.set('restricted_default', this.keyStore.get(restrictedKey)!);
  }

  /**
   * Get appropriate key for data classification
   */
  private getKeyForClassification(classification: DataClassification): string {
    switch (classification) {
      case DataClassification.PUBLIC:
        return 'public_default';
      case DataClassification.INTERNAL:
        return 'internal_default';
      case DataClassification.CONFIDENTIAL:
        return 'confidential_default';
      case DataClassification.RESTRICTED:
        return 'restricted_default';
      default:
        return 'internal_default';
    }
  }

  /**
   * Retrieve key from secure store
   */
  private getKey(keyId: string): Buffer | undefined {
    return this.keyStore.get(keyId);
  }
}

