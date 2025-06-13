/**
 * K3SS AI Coder - Immutable Audit Service
 * Cryptographically secured audit trail with tamper detection
 */

import { SecurityEvent, SecurityEventType } from '../security-framework';
import { EncryptionService } from '../encryption/encryption-service';
import * as crypto from 'crypto';

export interface AuditEntry {
  id: string;
  event: SecurityEvent;
  hash: string;
  previousHash: string;
  timestamp: Date;
  signature: string;
}

export class AuditService {
  private encryptionService: EncryptionService;
  private auditChain: AuditEntry[] = [];
  private lastHash: string = '0';

  constructor() {
    this.encryptionService = new EncryptionService();
  }

  /**
   * Log security event with cryptographic integrity
   */
  async logEvent(event: SecurityEvent): Promise<void> {
    try {
      const auditEntry = await this.createAuditEntry(event);
      
      // Add to immutable chain
      this.auditChain.push(auditEntry);
      this.lastHash = auditEntry.hash;

      // Persist to secure storage (in production, this would be a secure database)
      await this.persistAuditEntry(auditEntry);

      // Real-time monitoring for critical events
      if (event.severity === 'critical' || event.type === SecurityEventType.THREAT_DETECTED) {
        await this.triggerRealTimeAlert(auditEntry);
      }

    } catch (error) {
      // Critical: audit logging must never fail silently
      console.error('CRITICAL: Audit logging failed', error);
      throw new Error(`Audit logging failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify audit trail integrity
   */
  async verifyIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    if (this.auditChain.length === 0) {
      return { valid: true, issues: [] };
    }

    // Verify chain integrity
    let expectedPreviousHash = '0';
    
    for (let i = 0; i < this.auditChain.length; i++) {
      const entry = this.auditChain[i];
      
      // Verify previous hash linkage
      if (entry.previousHash !== expectedPreviousHash) {
        issues.push(`Hash chain broken at entry ${i}: expected ${expectedPreviousHash}, got ${entry.previousHash}`);
      }

      // Verify entry hash
      const calculatedHash = this.calculateEntryHash(entry);
      if (calculatedHash !== entry.hash) {
        issues.push(`Entry ${i} hash mismatch: calculated ${calculatedHash}, stored ${entry.hash}`);
      }

      // Verify signature
      const signatureValid = await this.verifySignature(entry);
      if (!signatureValid) {
        issues.push(`Entry ${i} signature verification failed`);
      }

      expectedPreviousHash = entry.hash;
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Query audit events with filters
   */
  async queryEvents(filters: {
    userId?: string;
    eventType?: SecurityEventType;
    severity?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<AuditEntry[]> {
    let results = this.auditChain;

    // Apply filters
    if (filters.userId) {
      results = results.filter(entry => entry.event.user?.id === filters.userId);
    }

    if (filters.eventType) {
      results = results.filter(entry => entry.event.type === filters.eventType);
    }

    if (filters.severity) {
      results = results.filter(entry => entry.event.severity === filters.severity);
    }

    if (filters.startTime) {
      results = results.filter(entry => entry.timestamp >= filters.startTime!);
    }

    if (filters.endTime) {
      results = results.filter(entry => entry.timestamp <= filters.endTime!);
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    failedAuthentications: number;
    dataAccesses: number;
    policyViolations: number;
    threatDetections: number;
  }> {
    const events = await this.queryEvents({ startTime: startDate, endTime: endDate });

    const report = {
      totalEvents: events.length,
      eventsByType: {} as Record<string, number>,
      eventsBySeverity: {} as Record<string, number>,
      failedAuthentications: 0,
      dataAccesses: 0,
      policyViolations: 0,
      threatDetections: 0
    };

    events.forEach(entry => {
      const event = entry.event;

      // Count by type
      report.eventsByType[event.type] = (report.eventsByType[event.type] || 0) + 1;

      // Count by severity
      report.eventsBySeverity[event.severity] = (report.eventsBySeverity[event.severity] || 0) + 1;

      // Specific counters
      if (event.type === SecurityEventType.AUTHENTICATION && event.result === 'failure') {
        report.failedAuthentications++;
      }

      if (event.type === SecurityEventType.DATA_ACCESS) {
        report.dataAccesses++;
      }

      if (event.type === SecurityEventType.POLICY_VIOLATION) {
        report.policyViolations++;
      }

      if (event.type === SecurityEventType.THREAT_DETECTED) {
        report.threatDetections++;
      }
    });

    return report;
  }

  /**
   * Create immutable audit entry
   */
  private async createAuditEntry(event: SecurityEvent): Promise<AuditEntry> {
    const id = this.encryptionService.generateSecureToken(16);
    const timestamp = new Date();

    // Create entry without hash first
    const entryData = {
      id,
      event,
      previousHash: this.lastHash,
      timestamp
    };

    // Calculate hash
    const hash = this.calculateEntryHash(entryData as AuditEntry);

    // Create signature
    const signature = await this.createSignature(entryData, hash);

    return {
      ...entryData,
      hash,
      signature
    };
  }

  /**
   * Calculate cryptographic hash for audit entry
   */
  private calculateEntryHash(entry: Partial<AuditEntry>): string {
    const hashData = {
      id: entry.id,
      event: entry.event,
      previousHash: entry.previousHash,
      timestamp: entry.timestamp?.toISOString()
    };

    return this.encryptionService.hash(JSON.stringify(hashData));
  }

  /**
   * Create digital signature for audit entry
   */
  private async createSignature(entryData: any, hash: string): Promise<string> {
    // In production, this would use proper digital signatures with private keys
    const signatureData = {
      ...entryData,
      hash,
      signingTime: new Date().toISOString()
    };

    return this.encryptionService.hash(JSON.stringify(signatureData), 'audit_signature_salt');
  }

  /**
   * Verify digital signature
   */
  private async verifySignature(entry: AuditEntry): Promise<boolean> {
    try {
      const entryData = {
        id: entry.id,
        event: entry.event,
        previousHash: entry.previousHash,
        timestamp: entry.timestamp
      };

      const expectedSignature = await this.createSignature(entryData, entry.hash);
      return expectedSignature === entry.signature;

    } catch (error) {
      return false;
    }
  }

  /**
   * Persist audit entry to secure storage
   */
  private async persistAuditEntry(entry: AuditEntry): Promise<void> {
    // In production, this would write to a secure, append-only database
    // For now, we'll simulate with in-memory storage
    console.log(`Audit entry persisted: ${entry.id} - ${entry.event.type}`);
  }

  /**
   * Trigger real-time alerts for critical events
   */
  private async triggerRealTimeAlert(entry: AuditEntry): Promise<void> {
    // In production, this would integrate with SIEM systems, send notifications, etc.
    console.warn(`SECURITY ALERT: ${entry.event.type} - ${entry.event.severity}`, {
      entryId: entry.id,
      timestamp: entry.timestamp,
      details: entry.event.details
    });
  }
}

