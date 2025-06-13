/**
 * K3SS AI Coder - Enterprise Authorization Service
 * Role-based access control with granular permissions
 */

import { User, Action, Resource, Permission, DataClassification } from '../security-framework';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: string[]; // Role inheritance
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  enabled: boolean;
}

export interface PolicyRule {
  effect: 'allow' | 'deny';
  principals: string[]; // User IDs or role names
  actions: string[];
  resources: string[];
  conditions?: Record<string, any>;
}

export interface AccessContext {
  user: User;
  action: Action;
  resource: Resource;
  environment: {
    time: Date;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  };
}

export class AuthorizationService {
  private roles: Map<string, Role> = new Map();
  private policies: Map<string, Policy> = new Map();
  private dataClassificationClearances: Map<string, DataClassification[]> = new Map();

  constructor() {
    this.initializeRoles();
    this.initializePolicies();
    this.initializeDataClassificationClearances();
  }

  /**
   * Check if user has permission for action on resource
   */
  async checkPermission(user: User, action: Action, resource: Resource): Promise<boolean> {
    try {
      const context: AccessContext = {
        user,
        action,
        resource,
        environment: {
          time: new Date()
        }
      };

      // Step 1: Check explicit deny policies first
      const denyResult = await this.evaluatePolicies(context, 'deny');
      if (denyResult) {
        return false; // Explicit deny overrides everything
      }

      // Step 2: Check role-based permissions
      const rolePermission = await this.checkRolePermissions(user, action, resource);
      if (rolePermission) {
        return true;
      }

      // Step 3: Check explicit allow policies
      const allowResult = await this.evaluatePolicies(context, 'allow');
      if (allowResult) {
        return true;
      }

      // Step 4: Default deny (zero-trust principle)
      return false;

    } catch (error) {
      // Fail secure - deny access on error
      return false;
    }
  }

  /**
   * Check if user has clearance for data classification
   */
  async hasDataClassificationClearance(user: User, classification: DataClassification): Promise<boolean> {
    const userClearances = this.dataClassificationClearances.get(user.id) || [];
    
    // Check if user has specific clearance
    if (userClearances.includes(classification)) {
      return true;
    }

    // Check role-based clearances
    for (const roleName of user.roles) {
      const roleClearances = this.dataClassificationClearances.get(`role:${roleName}`) || [];
      if (roleClearances.includes(classification)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get effective permissions for user
   */
  async getEffectivePermissions(user: User): Promise<Permission[]> {
    const permissions: Permission[] = [];

    // Add direct user permissions
    permissions.push(...user.permissions);

    // Add role-based permissions
    for (const roleName of user.roles) {
      const role = this.roles.get(roleName);
      if (role) {
        permissions.push(...role.permissions);

        // Add inherited role permissions
        if (role.inherits) {
          for (const inheritedRoleName of role.inherits) {
            const inheritedRole = this.roles.get(inheritedRoleName);
            if (inheritedRole) {
              permissions.push(...inheritedRole.permissions);
            }
          }
        }
      }
    }

    // Deduplicate and merge permissions
    return this.mergePermissions(permissions);
  }

  /**
   * Evaluate access request against policies
   */
  async evaluateAccessRequest(context: AccessContext): Promise<{
    allowed: boolean;
    reason: string;
    appliedPolicies: string[];
  }> {
    const appliedPolicies: string[] = [];

    // Check deny policies first
    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      for (const rule of policy.rules) {
        if (rule.effect === 'deny' && this.ruleMatches(rule, context)) {
          appliedPolicies.push(policy.id);
          return {
            allowed: false,
            reason: `Denied by policy: ${policy.name}`,
            appliedPolicies
          };
        }
      }
    }

    // Check allow policies
    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      for (const rule of policy.rules) {
        if (rule.effect === 'allow' && this.ruleMatches(rule, context)) {
          appliedPolicies.push(policy.id);
          return {
            allowed: true,
            reason: `Allowed by policy: ${policy.name}`,
            appliedPolicies
          };
        }
      }
    }

    // Check role permissions
    const hasRolePermission = await this.checkRolePermissions(
      context.user,
      context.action,
      context.resource
    );

    if (hasRolePermission) {
      return {
        allowed: true,
        reason: 'Allowed by role permissions',
        appliedPolicies
      };
    }

    return {
      allowed: false,
      reason: 'No matching allow policy or permission',
      appliedPolicies
    };
  }

  /**
   * Create new role
   */
  async createRole(role: Role): Promise<void> {
    this.roles.set(role.id, role);
  }

  /**
   * Create new policy
   */
  async createPolicy(policy: Policy): Promise<void> {
    this.policies.set(policy.id, policy);
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleName: string): Promise<void> {
    // In production, this would update the user in the database
    console.log(`Role ${roleName} assigned to user ${userId}`);
  }

  /**
   * Grant data classification clearance
   */
  async grantDataClassificationClearance(
    userId: string,
    classification: DataClassification
  ): Promise<void> {
    const clearances = this.dataClassificationClearances.get(userId) || [];
    if (!clearances.includes(classification)) {
      clearances.push(classification);
      this.dataClassificationClearances.set(userId, clearances);
    }
  }

  /**
   * Check role-based permissions
   */
  private async checkRolePermissions(user: User, action: Action, resource: Resource): Promise<boolean> {
    // Check direct user permissions
    if (this.hasMatchingPermission(user.permissions, action, resource)) {
      return true;
    }

    // Check role permissions
    for (const roleName of user.roles) {
      const role = this.roles.get(roleName);
      if (role && this.hasMatchingPermission(role.permissions, action, resource)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if permissions match action and resource
   */
  private hasMatchingPermission(permissions: Permission[], action: Action, resource: Resource): boolean {
    for (const permission of permissions) {
      // Check resource match (support wildcards)
      if (!this.resourceMatches(permission.resource, resource)) {
        continue;
      }

      // Check action match (support wildcards)
      if (!this.actionMatches(permission.actions, action)) {
        continue;
      }

      // Check conditions if present
      if (permission.conditions && !this.conditionsMatch(permission.conditions, action, resource)) {
        continue;
      }

      return true;
    }

    return false;
  }

  /**
   * Check if resource matches permission pattern
   */
  private resourceMatches(permissionResource: string, resource: Resource): boolean {
    if (permissionResource === '*') {
      return true;
    }

    if (permissionResource === resource.type) {
      return true;
    }

    if (permissionResource === `${resource.type}:${resource.id}`) {
      return true;
    }

    // Support wildcard patterns
    if (permissionResource.includes('*')) {
      const pattern = permissionResource.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(`${resource.type}:${resource.id}`);
    }

    return false;
  }

  /**
   * Check if action matches permission actions
   */
  private actionMatches(permissionActions: string[], action: Action): boolean {
    if (permissionActions.includes('*')) {
      return true;
    }

    if (permissionActions.includes(action.type)) {
      return true;
    }

    if (permissionActions.includes(`${action.type}:${action.operation}`)) {
      return true;
    }

    return false;
  }

  /**
   * Check if conditions match
   */
  private conditionsMatch(conditions: Record<string, any>, action: Action, resource: Resource): boolean {
    // Time-based conditions
    if (conditions.timeRange) {
      const now = new Date();
      const start = new Date(conditions.timeRange.start);
      const end = new Date(conditions.timeRange.end);
      if (now < start || now > end) {
        return false;
      }
    }

    // Resource owner condition
    if (conditions.resourceOwner && resource.owner !== conditions.resourceOwner) {
      return false;
    }

    // Custom conditions from action context
    if (conditions.custom && action.context) {
      for (const [key, value] of Object.entries(conditions.custom)) {
        if (action.context[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Evaluate policies with specific effect
   */
  private async evaluatePolicies(context: AccessContext, effect: 'allow' | 'deny'): Promise<boolean> {
    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      for (const rule of policy.rules) {
        if (rule.effect === effect && this.ruleMatches(rule, context)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if policy rule matches context
   */
  private ruleMatches(rule: PolicyRule, context: AccessContext): boolean {
    // Check principals (users or roles)
    const principalMatch = rule.principals.some(principal => {
      if (principal === '*') return true;
      if (principal === context.user.id) return true;
      if (principal.startsWith('role:')) {
        const roleName = principal.substring(5);
        return context.user.roles.includes(roleName);
      }
      return false;
    });

    if (!principalMatch) return false;

    // Check actions
    const actionMatch = rule.actions.some(actionPattern => {
      if (actionPattern === '*') return true;
      if (actionPattern === context.action.type) return true;
      if (actionPattern === `${context.action.type}:${context.action.operation}`) return true;
      return false;
    });

    if (!actionMatch) return false;

    // Check resources
    const resourceMatch = rule.resources.some(resourcePattern => {
      if (resourcePattern === '*') return true;
      if (resourcePattern === context.resource.type) return true;
      if (resourcePattern === `${context.resource.type}:${context.resource.id}`) return true;
      return false;
    });

    if (!resourceMatch) return false;

    // Check conditions
    if (rule.conditions) {
      return this.conditionsMatch(rule.conditions, context.action, context.resource);
    }

    return true;
  }

  /**
   * Merge and deduplicate permissions
   */
  private mergePermissions(permissions: Permission[]): Permission[] {
    const merged = new Map<string, Permission>();

    for (const permission of permissions) {
      const key = permission.resource;
      const existing = merged.get(key);

      if (existing) {
        // Merge actions
        const allActions = [...existing.actions, ...permission.actions];
        existing.actions = [...new Set(allActions)];
      } else {
        merged.set(key, { ...permission });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Initialize default roles
   */
  private initializeRoles(): void {
    // Super Admin Role
    this.roles.set('super_admin', {
      id: 'super_admin',
      name: 'Super Administrator',
      description: 'Full system access',
      permissions: [
        { resource: '*', actions: ['*'] }
      ]
    });

    // Admin Role
    this.roles.set('admin', {
      id: 'admin',
      name: 'Administrator',
      description: 'Administrative access',
      permissions: [
        { resource: 'users', actions: ['read', 'write', 'delete'] },
        { resource: 'roles', actions: ['read', 'write'] },
        { resource: 'policies', actions: ['read', 'write'] },
        { resource: 'audit', actions: ['read'] }
      ]
    });

    // Developer Role
    this.roles.set('developer', {
      id: 'developer',
      name: 'Developer',
      description: 'Development access',
      permissions: [
        { resource: 'code', actions: ['read', 'write'] },
        { resource: 'ai_models', actions: ['read', 'execute'] },
        { resource: 'browser', actions: ['read', 'write'] },
        { resource: 'cli', actions: ['execute'] }
      ]
    });

    // User Role
    this.roles.set('user', {
      id: 'user',
      name: 'User',
      description: 'Basic user access',
      permissions: [
        { resource: 'user_data', actions: ['read', 'write'] },
        { resource: 'ai_models', actions: ['read', 'execute'] }
      ]
    });
  }

  /**
   * Initialize default policies
   */
  private initializePolicies(): void {
    // Time-based access policy
    this.policies.set('business_hours', {
      id: 'business_hours',
      name: 'Business Hours Access',
      description: 'Restrict access to business hours',
      enabled: true,
      rules: [
        {
          effect: 'deny',
          principals: ['role:user'],
          actions: ['*'],
          resources: ['sensitive_data'],
          conditions: {
            timeRange: {
              start: '18:00',
              end: '08:00'
            }
          }
        }
      ]
    });

    // Data classification policy
    this.policies.set('data_classification', {
      id: 'data_classification',
      name: 'Data Classification Policy',
      description: 'Enforce data classification rules',
      enabled: true,
      rules: [
        {
          effect: 'deny',
          principals: ['role:user'],
          actions: ['export'],
          resources: ['restricted_data']
        }
      ]
    });
  }

  /**
   * Initialize data classification clearances
   */
  private initializeDataClassificationClearances(): void {
    // Super admin has all clearances
    this.dataClassificationClearances.set('role:super_admin', [
      DataClassification.PUBLIC,
      DataClassification.INTERNAL,
      DataClassification.CONFIDENTIAL,
      DataClassification.RESTRICTED
    ]);

    // Admin has most clearances
    this.dataClassificationClearances.set('role:admin', [
      DataClassification.PUBLIC,
      DataClassification.INTERNAL,
      DataClassification.CONFIDENTIAL
    ]);

    // Developer has limited clearances
    this.dataClassificationClearances.set('role:developer', [
      DataClassification.PUBLIC,
      DataClassification.INTERNAL
    ]);

    // User has basic clearances
    this.dataClassificationClearances.set('role:user', [
      DataClassification.PUBLIC
    ]);
  }
}

