/**
 * K3SS AI Coder - Security Framework Main Entry Point
 * Enterprise-grade security foundation
 */

// Core Security Framework
export { SecurityFramework } from './security-framework';
export { ZeroTrustSecurityManager } from './zero-trust-manager';

// Security API
export { SecurityAPI, SecurityAPIFactory } from './api/security-api';

// Authentication & Authorization
export { AuthenticationService } from './auth/authentication-service';
export { AuthorizationService } from './authorization/authorization-service';

// Encryption & Data Protection
export { EncryptionService } from './encryption/encryption-service';
export { DataProtectionManager } from './compliance/data-protection-manager';

// Compliance & Audit
export { ComplianceManager } from './compliance/compliance-manager';
export { AuditService } from './audit/audit-service';

// Threat Detection
export { ThreatDetectionService } from './threat-detection/threat-detection-service';

// Testing
export { runSecurityTests } from './tests/security-tests';

// Types and Interfaces
export * from './security-framework';

/**
 * Quick Start Example
 */
export function createSecurityFramework() {
  return SecurityAPIFactory.createDefault();
}

/**
 * Framework Information
 */
export const SECURITY_FRAMEWORK_INFO = {
  name: 'K3SS Security Framework',
  version: '1.0.0',
  description: 'Enterprise-grade security foundation with zero-trust architecture',
  features: [
    'Zero-Trust Security Architecture',
    'Multi-Provider Authentication (SAML, OAuth2, OIDC, LDAP)',
    'Multi-Factor Authentication',
    'Role-Based Access Control',
    'AES-256 Encryption with Key Rotation',
    'Immutable Audit Trail',
    'GDPR, CCPA, SOC 2 Compliance',
    'ML-Based Threat Detection',
    'Automated Incident Response',
    'Forensic Analysis Capabilities'
  ],
  compliance: ['GDPR', 'CCPA', 'SOC 2 Type II', 'ISO 27001'],
  security_standards: ['Zero Trust', 'Defense in Depth', 'Least Privilege', 'Privacy by Design']
};

