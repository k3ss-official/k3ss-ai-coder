/**
 * K3SS AI Coder - Security Framework Core Interface
 * Enterprise-grade security foundation with zero-trust architecture
 */

export interface SecurityFramework {
  /**
   * Authenticate user with credentials
   * @param credentials - User authentication credentials
   * @returns Promise resolving to authentication result
   */
  authenticateUser(credentials: Credentials): Promise<AuthResult>;

  /**
   * Authorize action for user on resource
   * @param user - Authenticated user
   * @param action - Action to authorize
   * @param resource - Resource being accessed
   * @returns Promise resolving to authorization decision
   */
  authorizeAction(user: User, action: Action, resource: Resource): Promise<boolean>;

  /**
   * Encrypt data with specified context
   * @param data - Data to encrypt
   * @param context - Security context for encryption
   * @returns Promise resolving to encrypted data
   */
  encryptData(data: any, context: SecurityContext): Promise<EncryptedData>;

  /**
   * Log security event for audit trail
   * @param event - Security event to log
   * @returns Promise resolving when event is logged
   */
  auditLog(event: SecurityEvent): Promise<void>;
}

export interface Credentials {
  username?: string;
  password?: string;
  token?: string;
  biometric?: BiometricData;
  mfa?: MFAToken;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  expiresAt?: Date;
  mfaRequired?: boolean;
  error?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: Permission[];
  lastLogin?: Date;
  mfaEnabled: boolean;
}

export interface Action {
  type: string;
  operation: string;
  context?: Record<string, any>;
}

export interface Resource {
  type: string;
  id: string;
  owner?: string;
  classification?: DataClassification;
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export interface SecurityContext {
  user: User;
  classification: DataClassification;
  purpose: string;
  retention?: RetentionPolicy;
}

export interface EncryptedData {
  data: string;
  algorithm: string;
  keyId: string;
  iv?: string;
  metadata?: Record<string, any>;
}

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: Date;
  user?: User;
  action?: Action;
  resource?: Resource;
  result: 'success' | 'failure' | 'warning';
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export enum SecurityEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  ENCRYPTION = 'encryption',
  DECRYPTION = 'decryption',
  THREAT_DETECTED = 'threat_detected',
  POLICY_VIOLATION = 'policy_violation',
  SYSTEM_ACCESS = 'system_access'
}

export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted'
}

export interface BiometricData {
  type: 'fingerprint' | 'face' | 'voice' | 'iris';
  data: string;
  confidence: number;
}

export interface MFAToken {
  type: 'totp' | 'sms' | 'email' | 'hardware';
  value: string;
  timestamp: Date;
}

export interface RetentionPolicy {
  duration: number; // in days
  autoDelete: boolean;
  archiveAfter?: number; // in days
}

