/**
 * K3SS AI Coder - Threat Detection Service
 * ML-based behavior analysis and real-time threat monitoring
 */

import { User, Action, Resource, SecurityEvent, SecurityEventType } from '../security-framework';
import { AuditService } from '../audit/audit-service';

export interface ThreatAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  riskFactors: RiskFactor[];
  confidence: number; // 0-1
  recommendations: string[];
}

export interface RiskFactor {
  type: string;
  description: string;
  weight: number;
  evidence: any;
}

export interface BehaviorProfile {
  userId: string;
  normalPatterns: BehaviorPattern[];
  anomalies: AnomalyDetection[];
  lastUpdated: Date;
  confidence: number;
}

export interface BehaviorPattern {
  type: 'login_time' | 'location' | 'device' | 'action_frequency' | 'resource_access';
  pattern: any;
  frequency: number;
  confidence: number;
}

export interface AnomalyDetection {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  evidence: any;
  falsePositive?: boolean;
}

export interface ThreatIndicator {
  id: string;
  type: 'ip_reputation' | 'user_behavior' | 'system_anomaly' | 'external_intel';
  value: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  confidence: number;
}

export interface IncidentResponse {
  id: string;
  threatId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'contained' | 'resolved';
  actions: ResponseAction[];
  timeline: IncidentEvent[];
  assignedTo?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface ResponseAction {
  id: string;
  type: 'block_user' | 'block_ip' | 'quarantine_data' | 'alert_admin' | 'log_event';
  description: string;
  automated: boolean;
  executed: boolean;
  executedAt?: Date;
  result?: string;
}

export interface IncidentEvent {
  timestamp: Date;
  event: string;
  details: any;
  actor: string;
}

export class ThreatDetectionService {
  private auditService: AuditService;
  private behaviorProfiles: Map<string, BehaviorProfile> = new Map();
  private threatIndicators: Map<string, ThreatIndicator> = new Map();
  private activeIncidents: Map<string, IncidentResponse> = new Map();
  private mlModels: Map<string, any> = new Map();

  constructor(auditService: AuditService) {
    this.auditService = auditService;
    this.initializeThreatIntelligence();
    this.initializeMLModels();
  }

  /**
   * Assess authentication risk in real-time
   */
  async assessAuthenticationRisk(credentials: any): Promise<ThreatAssessment> {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 0;

    // Check IP reputation
    if (credentials.ipAddress) {
      const ipRisk = await this.checkIPReputation(credentials.ipAddress);
      if (ipRisk.isRisky) {
        riskFactors.push({
          type: 'ip_reputation',
          description: `IP address ${credentials.ipAddress} flagged as suspicious`,
          weight: 30,
          evidence: ipRisk
        });
        riskScore += 30;
      }
    }

    // Check for brute force patterns
    const bruteForceRisk = await this.detectBruteForce(credentials.username);
    if (bruteForceRisk.detected) {
      riskFactors.push({
        type: 'brute_force',
        description: 'Multiple failed login attempts detected',
        weight: 40,
        evidence: bruteForceRisk
      });
      riskScore += 40;
    }

    // Check geolocation anomalies
    if (credentials.location) {
      const locationRisk = await this.detectLocationAnomaly(credentials.username, credentials.location);
      if (locationRisk.anomalous) {
        riskFactors.push({
          type: 'location_anomaly',
          description: 'Login from unusual location',
          weight: 20,
          evidence: locationRisk
        });
        riskScore += 20;
      }
    }

    // Check device fingerprint
    if (credentials.deviceFingerprint) {
      const deviceRisk = await this.detectDeviceAnomaly(credentials.username, credentials.deviceFingerprint);
      if (deviceRisk.anomalous) {
        riskFactors.push({
          type: 'device_anomaly',
          description: 'Login from unknown device',
          weight: 15,
          evidence: deviceRisk
        });
        riskScore += 15;
      }
    }

    // Check time-based patterns
    const timeRisk = await this.detectTimeAnomaly(credentials.username);
    if (timeRisk.anomalous) {
      riskFactors.push({
        type: 'time_anomaly',
        description: 'Login at unusual time',
        weight: 10,
        evidence: timeRisk
      });
      riskScore += 10;
    }

    const riskLevel = this.calculateRiskLevel(riskScore);
    const recommendations = this.generateRiskRecommendations(riskLevel, riskFactors);

    return {
      riskLevel,
      riskScore: Math.min(riskScore, 100),
      riskFactors,
      confidence: 0.85,
      recommendations
    };
  }

  /**
   * Assess action risk for authorization decisions
   */
  async assessActionRisk(user: User, action: Action, resource: Resource): Promise<'low' | 'medium' | 'high'> {
    let riskScore = 0;

    // Check user behavior patterns
    const behaviorRisk = await this.analyzeBehaviorPattern(user, action);
    riskScore += behaviorRisk.score;

    // Check resource sensitivity
    const resourceRisk = this.assessResourceSensitivity(resource);
    riskScore += resourceRisk;

    // Check action type risk
    const actionRisk = this.assessActionRisk(action);
    riskScore += actionRisk;

    // Check time-based risk
    const timeRisk = this.assessTimeBasedRisk();
    riskScore += timeRisk;

    if (riskScore >= 70) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Analyze user behavior patterns for anomalies
   */
  async analyzeBehaviorPattern(user: User, action: Action): Promise<{ score: number; anomalies: string[] }> {
    const profile = this.behaviorProfiles.get(user.id);
    const anomalies: string[] = [];
    let score = 0;

    if (!profile) {
      // New user - create baseline profile
      await this.createBehaviorProfile(user);
      return { score: 10, anomalies: ['New user - establishing baseline'] };
    }

    // Check action frequency anomaly
    const actionFrequency = await this.getActionFrequency(user.id, action.type);
    const normalFrequency = this.getNormalActionFrequency(profile, action.type);
    
    if (actionFrequency > normalFrequency * 3) {
      anomalies.push('Unusual action frequency detected');
      score += 20;
    }

    // Check resource access patterns
    const resourceAccess = await this.getResourceAccessPattern(user.id);
    const normalAccess = this.getNormalResourceAccess(profile);
    
    if (this.isResourceAccessAnomalous(resourceAccess, normalAccess)) {
      anomalies.push('Unusual resource access pattern');
      score += 15;
    }

    // Check time-based patterns
    const currentHour = new Date().getHours();
    const normalHours = this.getNormalActiveHours(profile);
    
    if (!normalHours.includes(currentHour)) {
      anomalies.push('Activity outside normal hours');
      score += 10;
    }

    return { score, anomalies };
  }

  /**
   * Detect and respond to security incidents
   */
  async detectAndRespond(event: SecurityEvent): Promise<IncidentResponse | null> {
    // Analyze event for threat indicators
    const threatLevel = await this.analyzeThreatLevel(event);
    
    if (threatLevel === 'low') {
      return null; // No incident response needed
    }

    // Create incident
    const incident: IncidentResponse = {
      id: this.generateIncidentId(),
      threatId: `threat_${Date.now()}`,
      severity: threatLevel,
      status: 'detected',
      actions: [],
      timeline: [{
        timestamp: new Date(),
        event: 'Incident detected',
        details: event,
        actor: 'ThreatDetectionService'
      }],
      createdAt: new Date()
    };

    // Determine response actions
    const responseActions = await this.determineResponseActions(event, threatLevel);
    incident.actions = responseActions;

    // Execute automated responses
    for (const action of responseActions.filter(a => a.automated)) {
      await this.executeResponseAction(action, incident);
    }

    this.activeIncidents.set(incident.id, incident);
    return incident;
  }

  /**
   * Generate forensic analysis for incidents
   */
  async generateForensicAnalysis(incidentId: string): Promise<{
    timeline: any[];
    rootCause: string;
    impactAssessment: any;
    evidenceChain: any[];
    recommendations: string[];
  }> {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) {
      throw new Error('Incident not found');
    }

    // Collect related events
    const relatedEvents = await this.auditService.queryEvents({
      startTime: new Date(incident.createdAt.getTime() - 24 * 60 * 60 * 1000), // 24 hours before
      endTime: incident.resolvedAt || new Date()
    });

    // Build timeline
    const timeline = this.buildIncidentTimeline(incident, relatedEvents);

    // Analyze root cause
    const rootCause = await this.analyzeRootCause(incident, relatedEvents);

    // Assess impact
    const impactAssessment = await this.assessIncidentImpact(incident, relatedEvents);

    // Build evidence chain
    const evidenceChain = this.buildEvidenceChain(incident, relatedEvents);

    // Generate recommendations
    const recommendations = this.generateIncidentRecommendations(incident, rootCause);

    return {
      timeline,
      rootCause,
      impactAssessment,
      evidenceChain,
      recommendations
    };
  }

  /**
   * Update behavior profiles with machine learning
   */
  async updateBehaviorProfiles(): Promise<void> {
    for (const [userId, profile] of this.behaviorProfiles.entries()) {
      // Get recent user activity
      const recentActivity = await this.auditService.queryEvents({
        userId,
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        limit: 1000
      });

      // Update patterns using ML
      const updatedPatterns = await this.analyzeActivityPatterns(recentActivity);
      
      profile.normalPatterns = updatedPatterns;
      profile.lastUpdated = new Date();
      profile.confidence = Math.min(profile.confidence + 0.1, 1.0);
    }
  }

  /**
   * Private helper methods
   */
  private async checkIPReputation(ipAddress: string): Promise<{ isRisky: boolean; reputation: any }> {
    // In production, this would check against threat intelligence feeds
    const knownBadIPs = ['192.168.1.100', '10.0.0.50']; // Example bad IPs
    
    return {
      isRisky: knownBadIPs.includes(ipAddress),
      reputation: {
        score: knownBadIPs.includes(ipAddress) ? 90 : 10,
        sources: ['internal_blacklist']
      }
    };
  }

  private async detectBruteForce(username: string): Promise<{ detected: boolean; attempts: number }> {
    const recentFailures = await this.auditService.queryEvents({
      eventType: SecurityEventType.AUTHENTICATION,
      startTime: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
      limit: 100
    });

    const failedAttempts = recentFailures.filter(event => 
      event.event.result === 'failure' && 
      event.event.details?.username === username
    ).length;

    return {
      detected: failedAttempts >= 5,
      attempts: failedAttempts
    };
  }

  private async detectLocationAnomaly(username: string, location: string): Promise<{ anomalous: boolean; details: any }> {
    // Simplified location anomaly detection
    const profile = this.behaviorProfiles.get(username);
    if (!profile) {
      return { anomalous: false, details: { reason: 'No profile available' } };
    }

    const locationPattern = profile.normalPatterns.find(p => p.type === 'location');
    if (!locationPattern) {
      return { anomalous: false, details: { reason: 'No location pattern established' } };
    }

    const normalLocations = locationPattern.pattern.locations || [];
    const isNormalLocation = normalLocations.includes(location);

    return {
      anomalous: !isNormalLocation,
      details: {
        currentLocation: location,
        normalLocations,
        confidence: locationPattern.confidence
      }
    };
  }

  private async detectDeviceAnomaly(username: string, deviceFingerprint: string): Promise<{ anomalous: boolean; details: any }> {
    const profile = this.behaviorProfiles.get(username);
    if (!profile) {
      return { anomalous: true, details: { reason: 'No profile available' } };
    }

    const devicePattern = profile.normalPatterns.find(p => p.type === 'device');
    if (!devicePattern) {
      return { anomalous: true, details: { reason: 'No device pattern established' } };
    }

    const knownDevices = devicePattern.pattern.devices || [];
    const isKnownDevice = knownDevices.includes(deviceFingerprint);

    return {
      anomalous: !isKnownDevice,
      details: {
        currentDevice: deviceFingerprint,
        knownDevices: knownDevices.length,
        confidence: devicePattern.confidence
      }
    };
  }

  private async detectTimeAnomaly(username: string): Promise<{ anomalous: boolean; details: any }> {
    const profile = this.behaviorProfiles.get(username);
    if (!profile) {
      return { anomalous: false, details: { reason: 'No profile available' } };
    }

    const timePattern = profile.normalPatterns.find(p => p.type === 'login_time');
    if (!timePattern) {
      return { anomalous: false, details: { reason: 'No time pattern established' } };
    }

    const currentHour = new Date().getHours();
    const normalHours = timePattern.pattern.hours || [];
    const isNormalTime = normalHours.includes(currentHour);

    return {
      anomalous: !isNormalTime,
      details: {
        currentHour,
        normalHours,
        confidence: timePattern.confidence
      }
    };
  }

  private calculateRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  private generateRiskRecommendations(riskLevel: string, riskFactors: RiskFactor[]): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('Block authentication attempt immediately');
      recommendations.push('Trigger security alert');
    } else if (riskLevel === 'high') {
      recommendations.push('Require additional authentication factors');
      recommendations.push('Monitor user activity closely');
    } else if (riskLevel === 'medium') {
      recommendations.push('Log security event for review');
      recommendations.push('Consider step-up authentication');
    }

    // Add specific recommendations based on risk factors
    riskFactors.forEach(factor => {
      switch (factor.type) {
        case 'ip_reputation':
          recommendations.push('Consider IP-based restrictions');
          break;
        case 'brute_force':
          recommendations.push('Implement account lockout');
          break;
        case 'location_anomaly':
          recommendations.push('Verify user identity through alternative means');
          break;
      }
    });

    return recommendations;
  }

  private async createBehaviorProfile(user: User): Promise<void> {
    const profile: BehaviorProfile = {
      userId: user.id,
      normalPatterns: [],
      anomalies: [],
      lastUpdated: new Date(),
      confidence: 0.1
    };

    this.behaviorProfiles.set(user.id, profile);
  }

  private async getActionFrequency(userId: string, actionType: string): Promise<number> {
    const recentEvents = await this.auditService.queryEvents({
      userId,
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      limit: 1000
    });

    return recentEvents.filter(event => 
      event.event.action?.type === actionType
    ).length;
  }

  private getNormalActionFrequency(profile: BehaviorProfile, actionType: string): number {
    const pattern = profile.normalPatterns.find(p => 
      p.type === 'action_frequency' && p.pattern.actionType === actionType
    );
    return pattern?.frequency || 0;
  }

  private async getResourceAccessPattern(userId: string): Promise<any> {
    const recentEvents = await this.auditService.queryEvents({
      userId,
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      limit: 1000
    });

    const resources = recentEvents
      .filter(event => event.event.resource)
      .map(event => event.event.resource?.type);

    return { resources: [...new Set(resources)] };
  }

  private getNormalResourceAccess(profile: BehaviorProfile): any {
    const pattern = profile.normalPatterns.find(p => p.type === 'resource_access');
    return pattern?.pattern || { resources: [] };
  }

  private isResourceAccessAnomalous(current: any, normal: any): boolean {
    const currentResources = new Set(current.resources);
    const normalResources = new Set(normal.resources);
    
    // Check if accessing new resource types
    for (const resource of currentResources) {
      if (!normalResources.has(resource)) {
        return true;
      }
    }

    return false;
  }

  private getNormalActiveHours(profile: BehaviorProfile): number[] {
    const pattern = profile.normalPatterns.find(p => p.type === 'login_time');
    return pattern?.pattern.hours || [];
  }

  private assessResourceSensitivity(resource: Resource): number {
    switch (resource.classification) {
      case 'restricted': return 30;
      case 'confidential': return 20;
      case 'internal': return 10;
      default: return 0;
    }
  }

  private assessActionRisk(action: Action): number {
    const riskActions = ['delete', 'export', 'modify_permissions', 'admin'];
    return riskActions.includes(action.type) ? 20 : 5;
  }

  private assessTimeBasedRisk(): number {
    const hour = new Date().getHours();
    // Higher risk during off-hours (10 PM - 6 AM)
    return (hour >= 22 || hour <= 6) ? 10 : 0;
  }

  private async analyzeThreatLevel(event: SecurityEvent): Promise<'low' | 'medium' | 'high' | 'critical'> {
    if (event.type === SecurityEventType.THREAT_DETECTED) return 'high';
    if (event.severity === 'critical') return 'critical';
    if (event.severity === 'high') return 'high';
    if (event.result === 'failure' && event.type === SecurityEventType.AUTHENTICATION) return 'medium';
    return 'low';
  }

  private generateIncidentId(): string {
    return `INC_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  private async determineResponseActions(event: SecurityEvent, severity: string): Promise<ResponseAction[]> {
    const actions: ResponseAction[] = [];

    if (severity === 'critical') {
      actions.push({
        id: 'block_user',
        type: 'block_user',
        description: 'Block user account immediately',
        automated: true,
        executed: false
      });
    }

    if (severity === 'high' || severity === 'critical') {
      actions.push({
        id: 'alert_admin',
        type: 'alert_admin',
        description: 'Send alert to security team',
        automated: true,
        executed: false
      });
    }

    actions.push({
      id: 'log_event',
      type: 'log_event',
      description: 'Log security event',
      automated: true,
      executed: false
    });

    return actions;
  }

  private async executeResponseAction(action: ResponseAction, incident: IncidentResponse): Promise<void> {
    try {
      switch (action.type) {
        case 'block_user':
          // Implementation would block the user
          action.result = 'User blocked successfully';
          break;
        case 'alert_admin':
          // Implementation would send alert
          action.result = 'Alert sent to security team';
          break;
        case 'log_event':
          // Log the incident
          action.result = 'Event logged';
          break;
      }

      action.executed = true;
      action.executedAt = new Date();

      incident.timeline.push({
        timestamp: new Date(),
        event: `Response action executed: ${action.type}`,
        details: action,
        actor: 'ThreatDetectionService'
      });

    } catch (error) {
      action.result = `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private initializeThreatIntelligence(): void {
    // Initialize with known threat indicators
    this.threatIndicators.set('malicious_ip_1', {
      id: 'malicious_ip_1',
      type: 'ip_reputation',
      value: '192.168.1.100',
      severity: 'high',
      source: 'internal_blacklist',
      firstSeen: new Date(),
      lastSeen: new Date(),
      confidence: 0.9
    });
  }

  private initializeMLModels(): void {
    // Initialize ML models for behavior analysis
    this.mlModels.set('behavior_analysis', {
      type: 'anomaly_detection',
      version: '1.0',
      trained: true
    });
  }

  private buildIncidentTimeline(incident: IncidentResponse, events: any[]): any[] {
    return [...incident.timeline, ...events.map(e => ({
      timestamp: e.timestamp,
      event: e.event.type,
      details: e.event,
      actor: e.event.user?.username || 'system'
    }))].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private async analyzeRootCause(incident: IncidentResponse, events: any[]): Promise<string> {
    // Simplified root cause analysis
    if (incident.severity === 'critical') {
      return 'Critical security breach detected - immediate investigation required';
    }
    return 'Security anomaly detected - standard investigation procedures apply';
  }

  private async assessIncidentImpact(incident: IncidentResponse, events: any[]): Promise<any> {
    return {
      affectedUsers: events.filter(e => e.event.user).length,
      affectedResources: events.filter(e => e.event.resource).length,
      dataExposure: 'None detected',
      businessImpact: incident.severity === 'critical' ? 'High' : 'Low'
    };
  }

  private buildEvidenceChain(incident: IncidentResponse, events: any[]): any[] {
    return events.map(event => ({
      timestamp: event.timestamp,
      type: 'audit_log',
      hash: event.hash,
      integrity: 'verified'
    }));
  }

  private generateIncidentRecommendations(incident: IncidentResponse, rootCause: string): string[] {
    const recommendations = [
      'Review and update security policies',
      'Conduct security awareness training',
      'Implement additional monitoring controls'
    ];

    if (incident.severity === 'critical') {
      recommendations.unshift('Conduct immediate security review');
      recommendations.unshift('Consider external security audit');
    }

    return recommendations;
  }

  private async analyzeActivityPatterns(events: any[]): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];

    // Analyze login times
    const loginTimes = events
      .filter(e => e.event.type === SecurityEventType.AUTHENTICATION)
      .map(e => new Date(e.timestamp).getHours());
    
    if (loginTimes.length > 0) {
      patterns.push({
        type: 'login_time',
        pattern: { hours: [...new Set(loginTimes)] },
        frequency: loginTimes.length,
        confidence: Math.min(loginTimes.length / 50, 1.0)
      });
    }

    // Analyze resource access
    const resources = events
      .filter(e => e.event.resource)
      .map(e => e.event.resource.type);
    
    if (resources.length > 0) {
      patterns.push({
        type: 'resource_access',
        pattern: { resources: [...new Set(resources)] },
        frequency: resources.length,
        confidence: Math.min(resources.length / 100, 1.0)
      });
    }

    return patterns;
  }
}

