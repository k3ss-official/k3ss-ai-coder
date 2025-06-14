"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityManager = void 0;
const crypto = __importStar(require("crypto"));
/**
 * Self-contained Security Manager for enterprise features and credential management
 */
class SecurityManager {
    constructor(context) {
        this.isInitialized = false;
        this.auditLog = [];
        this.context = context;
        this.encryptionKey = this.generateEncryptionKey();
    }
    async initialize() {
        try {
            await this.loadAuditLog();
            this.logAuditEvent('system', 'security_manager_initialized', 'Security Manager started');
            this.isInitialized = true;
            console.log('Security Manager initialized');
        }
        catch (error) {
            console.error('Security Manager initialization failed:', error);
            throw error;
        }
    }
    async encryptCredential(key, value) {
        try {
            const encrypted = this.encrypt(value);
            await this.context.secrets.store(key, encrypted);
            this.logAuditEvent('credential', 'credential_stored', `Credential stored: ${key}`);
        }
        catch (error) {
            this.logAuditEvent('credential', 'credential_store_failed', `Failed to store credential: ${key}`);
            throw new Error(`Failed to encrypt credential: ${error}`);
        }
    }
    async decryptCredential(key) {
        try {
            const encrypted = await this.context.secrets.get(key);
            if (!encrypted) {
                return undefined;
            }
            const decrypted = this.decrypt(encrypted);
            this.logAuditEvent('credential', 'credential_accessed', `Credential accessed: ${key}`);
            return decrypted;
        }
        catch (error) {
            this.logAuditEvent('credential', 'credential_access_failed', `Failed to access credential: ${key}`);
            throw new Error(`Failed to decrypt credential: ${error}`);
        }
    }
    async deleteCredential(key) {
        try {
            await this.context.secrets.delete(key);
            this.logAuditEvent('credential', 'credential_deleted', `Credential deleted: ${key}`);
        }
        catch (error) {
            this.logAuditEvent('credential', 'credential_delete_failed', `Failed to delete credential: ${key}`);
            throw new Error(`Failed to delete credential: ${error}`);
        }
    }
    async validateApiKey(provider, apiKey) {
        try {
            // Basic API key validation
            if (!apiKey || apiKey.length < 10) {
                this.logAuditEvent('validation', 'api_key_invalid', `Invalid API key format for ${provider}`);
                return false;
            }
            // Provider-specific validation
            const isValid = this.validateProviderApiKey(provider, apiKey);
            if (isValid) {
                this.logAuditEvent('validation', 'api_key_valid', `Valid API key for ${provider}`);
            }
            else {
                this.logAuditEvent('validation', 'api_key_invalid', `Invalid API key for ${provider}`);
            }
            return isValid;
        }
        catch (error) {
            this.logAuditEvent('validation', 'api_key_validation_error', `API key validation error for ${provider}: ${error}`);
            return false;
        }
    }
    async scanCodeForSecurityIssues(code, language) {
        try {
            const issues = this.performSecurityScan(code, language);
            this.logAuditEvent('security_scan', 'code_scanned', `Security scan performed for ${language} code`);
            return {
                language: language,
                codeLength: code.length,
                issues: issues,
                riskLevel: this.calculateRiskLevel(issues),
                timestamp: new Date().toISOString(),
                scanId: this.generateScanId()
            };
        }
        catch (error) {
            this.logAuditEvent('security_scan', 'scan_failed', `Security scan failed: ${error}`);
            throw new Error(`Security scan failed: ${error}`);
        }
    }
    async getComplianceReport() {
        try {
            const report = {
                timestamp: new Date().toISOString(),
                auditEvents: this.auditLog.length,
                credentialsStored: await this.getStoredCredentialsCount(),
                securityFeatures: {
                    encryptionEnabled: true,
                    auditLoggingEnabled: true,
                    credentialManagementEnabled: true,
                    securityScanningEnabled: true
                },
                complianceStatus: 'compliant',
                recommendations: this.getSecurityRecommendations()
            };
            this.logAuditEvent('compliance', 'report_generated', 'Compliance report generated');
            return report;
        }
        catch (error) {
            this.logAuditEvent('compliance', 'report_failed', `Compliance report generation failed: ${error}`);
            throw new Error(`Failed to generate compliance report: ${error}`);
        }
    }
    encrypt(text) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, key);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }
    decrypt(encryptedText) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto.createDecipher(algorithm, key);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    generateEncryptionKey() {
        return crypto.randomBytes(32).toString('hex');
    }
    validateProviderApiKey(provider, apiKey) {
        switch (provider.toLowerCase()) {
            case 'openai':
                return apiKey.startsWith('sk-') && apiKey.length > 40;
            case 'anthropic':
                return apiKey.startsWith('sk-ant-') && apiKey.length > 50;
            case 'google':
                return apiKey.length > 30;
            default:
                return apiKey.length > 10;
        }
    }
    performSecurityScan(code, language) {
        const issues = [];
        // Common security patterns to check
        const securityPatterns = [
            {
                pattern: /password\s*=\s*["'][^"']+["']/gi,
                type: 'hardcoded_password',
                severity: 'high',
                message: 'Hardcoded password detected'
            },
            {
                pattern: /api[_-]?key\s*=\s*["'][^"']+["']/gi,
                type: 'hardcoded_api_key',
                severity: 'high',
                message: 'Hardcoded API key detected'
            },
            {
                pattern: /eval\s*\(/gi,
                type: 'code_injection',
                severity: 'high',
                message: 'Potential code injection with eval()'
            },
            {
                pattern: /innerHTML\s*=/gi,
                type: 'xss_vulnerability',
                severity: 'medium',
                message: 'Potential XSS vulnerability with innerHTML'
            },
            {
                pattern: /document\.write\s*\(/gi,
                type: 'xss_vulnerability',
                severity: 'medium',
                message: 'Potential XSS vulnerability with document.write()'
            },
            {
                pattern: /console\.log\s*\(/gi,
                type: 'information_disclosure',
                severity: 'low',
                message: 'Console.log statement may leak sensitive information'
            }
        ];
        securityPatterns.forEach(pattern => {
            const matches = code.match(pattern.pattern);
            if (matches) {
                matches.forEach(match => {
                    issues.push({
                        type: pattern.type,
                        severity: pattern.severity,
                        message: pattern.message,
                        code: match,
                        line: this.findLineNumber(code, match)
                    });
                });
            }
        });
        return issues;
    }
    findLineNumber(code, searchText) {
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(searchText)) {
                return i + 1;
            }
        }
        return 1;
    }
    calculateRiskLevel(issues) {
        const highIssues = issues.filter(i => i.severity === 'high').length;
        const mediumIssues = issues.filter(i => i.severity === 'medium').length;
        if (highIssues > 0) {
            return 'high';
        }
        else if (mediumIssues > 2) {
            return 'high';
        }
        else if (mediumIssues > 0 || issues.length > 5) {
            return 'medium';
        }
        else {
            return 'low';
        }
    }
    generateScanId() {
        return crypto.randomBytes(8).toString('hex');
    }
    async getStoredCredentialsCount() {
        // This is a simplified count - in a real implementation,
        // you'd need to track stored credentials
        return 0;
    }
    getSecurityRecommendations() {
        return [
            'Use environment variables for sensitive configuration',
            'Enable two-factor authentication where possible',
            'Regularly rotate API keys and credentials',
            'Keep dependencies updated to latest secure versions',
            'Use HTTPS for all external communications',
            'Implement proper input validation and sanitization',
            'Regular security audits and code reviews'
        ];
    }
    logAuditEvent(category, action, details) {
        const event = {
            timestamp: new Date().toISOString(),
            category: category,
            action: action,
            details: details,
            userId: 'vscode-user',
            sessionId: this.context.extension.id
        };
        this.auditLog.push(event);
        // Keep only last 1000 events to prevent memory issues
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-1000);
        }
        // Save audit log periodically
        this.saveAuditLog();
    }
    async loadAuditLog() {
        try {
            const stored = this.context.globalState.get('auditLog', []);
            this.auditLog = stored;
        }
        catch (error) {
            console.error('Failed to load audit log:', error);
            this.auditLog = [];
        }
    }
    async saveAuditLog() {
        try {
            await this.context.globalState.update('auditLog', this.auditLog);
        }
        catch (error) {
            console.error('Failed to save audit log:', error);
        }
    }
    getAuditLog() {
        return [...this.auditLog];
    }
    isReady() {
        return this.isInitialized;
    }
    getSecurityFeatures() {
        return [
            'Encrypted Credential Storage',
            'Audit Logging',
            'Security Code Scanning',
            'API Key Validation',
            'Compliance Reporting',
            'Risk Assessment'
        ];
    }
}
exports.SecurityManager = SecurityManager;
//# sourceMappingURL=SecurityManager.js.map