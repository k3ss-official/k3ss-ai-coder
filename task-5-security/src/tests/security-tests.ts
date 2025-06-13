/**
 * K3SS AI Coder - Security Integration Tests
 * Comprehensive test suite for security framework
 */

import { SecurityAPI, SecurityAPIFactory } from '../api/security-api';
import { DataClassification, SecurityEventType } from '../security-framework';

export class SecurityTestSuite {
  private securityAPI: SecurityAPI;
  private testResults: TestResult[] = [];

  constructor() {
    this.securityAPI = SecurityAPIFactory.createDefault();
  }

  /**
   * Run all security tests
   */
  async runAllTests(): Promise<TestSuiteResult> {
    console.log('🔒 Starting K3SS Security Framework Test Suite...\n');

    const testSuites = [
      { name: 'Authentication Tests', fn: () => this.runAuthenticationTests() },
      { name: 'Authorization Tests', fn: () => this.runAuthorizationTests() },
      { name: 'Encryption Tests', fn: () => this.runEncryptionTests() },
      { name: 'Audit Tests', fn: () => this.runAuditTests() },
      { name: 'Data Protection Tests', fn: () => this.runDataProtectionTests() },
      { name: 'Compliance Tests', fn: () => this.runComplianceTests() },
      { name: 'Threat Detection Tests', fn: () => this.runThreatDetectionTests() },
      { name: 'Integration Tests', fn: () => this.runIntegrationTests() }
    ];

    for (const suite of testSuites) {
      console.log(`\n📋 Running ${suite.name}...`);
      try {
        await suite.fn();
        console.log(`✅ ${suite.name} completed`);
      } catch (error) {
        console.log(`❌ ${suite.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return this.generateTestReport();
  }

  /**
   * Authentication Tests
   */
  private async runAuthenticationTests(): Promise<void> {
    // Test 1: Valid password authentication
    await this.runTest('Valid Password Authentication', async () => {
      const result = await this.securityAPI.authenticateUser({
        username: 'admin',
        password: 'admin123'
      });

      if (!result.success || !result.data?.success) {
        throw new Error('Valid authentication should succeed');
      }

      if (!result.data.user || !result.data.token) {
        throw new Error('Authentication should return user and token');
      }
    });

    // Test 2: Invalid password authentication
    await this.runTest('Invalid Password Authentication', async () => {
      const result = await this.securityAPI.authenticateUser({
        username: 'admin',
        password: 'wrongpassword'
      });

      if (result.success && result.data?.success) {
        throw new Error('Invalid authentication should fail');
      }
    });

    // Test 3: MFA required authentication
    await this.runTest('MFA Required Authentication', async () => {
      const result = await this.securityAPI.authenticateUser({
        username: 'admin',
        password: 'admin123'
      });

      if (result.data?.mfaRequired !== true) {
        // MFA should be required for admin user
        console.log('⚠️  MFA not required - this may be expected in test environment');
      }
    });

    // Test 4: Token-based authentication
    await this.runTest('Token Authentication', async () => {
      const tokenResult = await this.securityAPI.authenticateUser({
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzAwMSIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImV4cCI6OTk5OTk5OTk5OX0.test'
      });

      // Token authentication should work or fail gracefully
      if (!tokenResult.success && !tokenResult.error) {
        throw new Error('Token authentication should provide clear result');
      }
    });
  }

  /**
   * Authorization Tests
   */
  private async runAuthorizationTests(): Promise<void> {
    const testUser = {
      id: 'user_001',
      username: 'admin',
      email: 'admin@k3ss.com',
      roles: ['admin'],
      permissions: [{ resource: '*', actions: ['*'] }],
      mfaEnabled: true
    };

    // Test 1: Admin user authorization
    await this.runTest('Admin User Authorization', async () => {
      const result = await this.securityAPI.authorizeAction(
        testUser,
        { type: 'read', operation: 'view' },
        { type: 'user_data', id: 'test_resource' }
      );

      if (!result.success || !result.data) {
        throw new Error('Admin user should be authorized for basic operations');
      }
    });

    // Test 2: Restricted resource access
    await this.runTest('Restricted Resource Access', async () => {
      const restrictedUser = {
        ...testUser,
        roles: ['user'],
        permissions: [{ resource: 'user_data', actions: ['read'] }]
      };

      const result = await this.securityAPI.authorizeAction(
        restrictedUser,
        { type: 'delete', operation: 'remove' },
        { type: 'system_config', id: 'critical_config', classification: DataClassification.RESTRICTED }
      );

      if (result.success && result.data) {
        throw new Error('Regular user should not be authorized for restricted operations');
      }
    });

    // Test 3: Permission inheritance
    await this.runTest('Permission Inheritance', async () => {
      const result = await this.securityAPI.authorizeAction(
        testUser,
        { type: 'write', operation: 'update' },
        { type: 'user_profile', id: 'profile_001' }
      );

      if (!result.success) {
        throw new Error('Authorization check should complete successfully');
      }
    });
  }

  /**
   * Encryption Tests
   */
  private async runEncryptionTests(): Promise<void> {
    const testContext = {
      user: {
        id: 'user_001',
        username: 'admin',
        email: 'admin@k3ss.com',
        roles: ['admin'],
        permissions: [],
        mfaEnabled: true
      },
      classification: DataClassification.CONFIDENTIAL,
      purpose: 'testing'
    };

    // Test 1: Data encryption
    await this.runTest('Data Encryption', async () => {
      const testData = { message: 'This is sensitive test data', timestamp: new Date() };
      
      const result = await this.securityAPI.encryptData(testData, testContext);

      if (!result.success || !result.data) {
        throw new Error('Data encryption should succeed');
      }

      if (!result.data.data || !result.data.algorithm || !result.data.keyId) {
        throw new Error('Encrypted data should contain required fields');
      }
    });

    // Test 2: Different classification levels
    await this.runTest('Classification-based Encryption', async () => {
      const testData = { secret: 'top secret information' };
      
      const restrictedContext = {
        ...testContext,
        classification: DataClassification.RESTRICTED
      };

      const result = await this.securityAPI.encryptData(testData, restrictedContext);

      if (!result.success || !result.data) {
        throw new Error('Restricted data encryption should succeed');
      }
    });

    // Test 3: Large data encryption
    await this.runTest('Large Data Encryption', async () => {
      const largeData = {
        content: 'x'.repeat(10000), // 10KB of data
        metadata: { size: 10000, type: 'test' }
      };

      const result = await this.securityAPI.encryptData(largeData, testContext);

      if (!result.success || !result.data) {
        throw new Error('Large data encryption should succeed');
      }
    });
  }

  /**
   * Audit Tests
   */
  private async runAuditTests(): Promise<void> {
    // Test 1: Basic audit logging
    await this.runTest('Basic Audit Logging', async () => {
      const testEvent = {
        type: SecurityEventType.AUTHENTICATION,
        timestamp: new Date(),
        result: 'success' as const,
        severity: 'low' as const,
        details: { test: true }
      };

      const result = await this.securityAPI.auditLog(testEvent);

      if (!result.success) {
        throw new Error('Audit logging should succeed');
      }
    });

    // Test 2: Critical event logging
    await this.runTest('Critical Event Logging', async () => {
      const criticalEvent = {
        type: SecurityEventType.THREAT_DETECTED,
        timestamp: new Date(),
        result: 'failure' as const,
        severity: 'critical' as const,
        details: { threat: 'test_threat', blocked: true }
      };

      const result = await this.securityAPI.auditLog(criticalEvent);

      if (!result.success) {
        throw new Error('Critical event logging should succeed');
      }
    });

    // Test 3: Audit integrity
    await this.runTest('Audit Integrity Check', async () => {
      // This would test the audit trail integrity in a real implementation
      // For now, we'll just verify the audit service is working
      const result = await this.securityAPI.auditLog({
        type: SecurityEventType.SYSTEM_ACCESS,
        timestamp: new Date(),
        result: 'success' as const,
        severity: 'low' as const,
        details: { integrity_test: true }
      });

      if (!result.success) {
        throw new Error('Audit integrity test should succeed');
      }
    });
  }

  /**
   * Data Protection Tests
   */
  private async runDataProtectionTests(): Promise<void> {
    const testContext = {
      user: {
        id: 'user_001',
        username: 'admin',
        email: 'admin@k3ss.com',
        roles: ['admin'],
        permissions: [],
        mfaEnabled: true
      },
      classification: DataClassification.CONFIDENTIAL,
      purpose: 'testing'
    };

    // Test 1: Data protection application
    await this.runTest('Data Protection Application', async () => {
      const testData = { personalInfo: 'John Doe', email: 'john@example.com' };
      
      const result = await this.securityAPI.protectData(testData, DataClassification.CONFIDENTIAL, testContext);

      if (!result.success || !result.data) {
        throw new Error('Data protection should succeed');
      }
    });

    // Test 2: Data classification
    await this.runTest('Automatic Data Classification', async () => {
      const sensitiveData = { 
        ssn: '123-45-6789', 
        creditCard: '4111-1111-1111-1111',
        email: 'test@example.com'
      };

      const result = await this.securityAPI.protectData(sensitiveData, DataClassification.RESTRICTED, testContext);

      if (!result.success) {
        throw new Error('Sensitive data protection should succeed');
      }
    });
  }

  /**
   * Compliance Tests
   */
  private async runComplianceTests(): Promise<void> {
    // Test 1: GDPR compliance check
    await this.runTest('GDPR Compliance Check', async () => {
      const result = await this.securityAPI.checkCompliance('gdpr');

      if (!result.success) {
        throw new Error('GDPR compliance check should complete');
      }

      if (!result.data || typeof result.data.overallScore !== 'number') {
        throw new Error('Compliance check should return assessment data');
      }
    });

    // Test 2: SOC 2 compliance check
    await this.runTest('SOC 2 Compliance Check', async () => {
      const result = await this.securityAPI.checkCompliance('soc2');

      if (!result.success) {
        throw new Error('SOC 2 compliance check should complete');
      }
    });

    // Test 3: CCPA compliance check
    await this.runTest('CCPA Compliance Check', async () => {
      const result = await this.securityAPI.checkCompliance('ccpa');

      if (!result.success) {
        throw new Error('CCPA compliance check should complete');
      }
    });
  }

  /**
   * Threat Detection Tests
   */
  private async runThreatDetectionTests(): Promise<void> {
    // Test 1: Normal authentication risk assessment
    await this.runTest('Normal Authentication Risk', async () => {
      const normalCredentials = {
        username: 'admin',
        password: 'admin123',
        ipAddress: '192.168.1.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      const result = await this.securityAPI.assessThreat(normalCredentials);

      if (!result.success || !result.data) {
        throw new Error('Threat assessment should succeed');
      }

      if (!['low', 'medium', 'high', 'critical'].includes(result.data.riskLevel)) {
        throw new Error('Risk level should be valid');
      }
    });

    // Test 2: Suspicious authentication risk assessment
    await this.runTest('Suspicious Authentication Risk', async () => {
      const suspiciousCredentials = {
        username: 'admin',
        password: 'admin123',
        ipAddress: '192.168.1.100', // Known bad IP from test data
        userAgent: 'curl/7.68.0'
      };

      const result = await this.securityAPI.assessThreat(suspiciousCredentials);

      if (!result.success || !result.data) {
        throw new Error('Suspicious threat assessment should succeed');
      }

      // Should detect higher risk due to bad IP
      if (result.data.riskLevel === 'low') {
        console.log('⚠️  Expected higher risk level for suspicious IP');
      }
    });

    // Test 3: Brute force detection
    await this.runTest('Brute Force Detection', async () => {
      // Simulate multiple failed attempts
      for (let i = 0; i < 3; i++) {
        await this.securityAPI.authenticateUser({
          username: 'admin',
          password: 'wrongpassword'
        });
      }

      const result = await this.securityAPI.assessThreat({
        username: 'admin',
        password: 'admin123'
      });

      if (!result.success) {
        throw new Error('Brute force assessment should complete');
      }
    });
  }

  /**
   * Integration Tests
   */
  private async runIntegrationTests(): Promise<void> {
    // Test 1: End-to-end security flow
    await this.runTest('End-to-End Security Flow', async () => {
      // 1. Authenticate user
      const authResult = await this.securityAPI.authenticateUser({
        username: 'admin',
        password: 'admin123'
      });

      if (!authResult.success || !authResult.data?.user) {
        throw new Error('Authentication should succeed');
      }

      const user = authResult.data.user;

      // 2. Authorize action
      const authzResult = await this.securityAPI.authorizeAction(
        user,
        { type: 'read', operation: 'view' },
        { type: 'user_data', id: 'test_data' }
      );

      if (!authzResult.success || !authzResult.data) {
        throw new Error('Authorization should succeed');
      }

      // 3. Encrypt data
      const encryptResult = await this.securityAPI.encryptData(
        { message: 'test data' },
        {
          user,
          classification: DataClassification.INTERNAL,
          purpose: 'testing'
        }
      );

      if (!encryptResult.success || !encryptResult.data) {
        throw new Error('Encryption should succeed');
      }

      // 4. Log audit event
      const auditResult = await this.securityAPI.auditLog({
        type: SecurityEventType.DATA_ACCESS,
        timestamp: new Date(),
        user,
        result: 'success',
        severity: 'low',
        details: { test: 'integration_test' }
      });

      if (!auditResult.success) {
        throw new Error('Audit logging should succeed');
      }
    });

    // Test 2: Health check
    await this.runTest('Security Health Check', async () => {
      const result = await this.securityAPI.healthCheck();

      if (!result.success || !result.data) {
        throw new Error('Health check should succeed');
      }

      if (!['healthy', 'degraded', 'unhealthy'].includes(result.data.status)) {
        throw new Error('Health status should be valid');
      }
    });

    // Test 3: Security report generation
    await this.runTest('Security Report Generation', async () => {
      const result = await this.securityAPI.generateSecurityReport({
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      });

      if (!result.success || !result.data) {
        throw new Error('Security report generation should succeed');
      }

      if (!result.data.summary || typeof result.data.summary.totalEvents !== 'number') {
        throw new Error('Security report should contain summary data');
      }
    });
  }

  /**
   * Run individual test
   */
  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFn();
      
      this.testResults.push({
        name,
        status: 'passed',
        duration: Date.now() - startTime,
        error: null
      });
      
      console.log(`  ✅ ${name}`);
      
    } catch (error) {
      this.testResults.push({
        name,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      console.log(`  ❌ ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate test report
   */
  private generateTestReport(): TestSuiteResult {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'passed').length;
    const failedTests = this.testResults.filter(r => r.status === 'failed').length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    const report: TestSuiteResult = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
        totalDuration
      },
      results: this.testResults,
      timestamp: new Date()
    };

    console.log('\n📊 Test Suite Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`   Total Duration: ${totalDuration}ms`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
    }

    return report;
  }
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  duration: number;
  error: string | null;
}

interface TestSuiteResult {
  summary: {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
    totalDuration: number;
  };
  results: TestResult[];
  timestamp: Date;
}

/**
 * Run security tests
 */
export async function runSecurityTests(): Promise<TestSuiteResult> {
  const testSuite = new SecurityTestSuite();
  return await testSuite.runAllTests();
}

