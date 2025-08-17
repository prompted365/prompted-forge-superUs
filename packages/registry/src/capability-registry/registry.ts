import { winston } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import {
  ForgeRegistry,
  TenantScope,
  AllowedServers,
  CapabilityScope,
  GovernancePolicy,
  AccessValidationResult,
  TenantID,
  ServerID,
  RoleID,
  PolicyID,
} from '../types';

export class CapabilityRegistryManager {
  private registry: ForgeRegistry;
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.registry = {
      tenants: new Map(),
      serverAllowlist: new Map(),
      capabilityBindings: new Map(),
      policyRules: new Map(),
    };
  }

  // Tenant Management
  async createTenant(tenantData: Omit<TenantScope, 'id'>): Promise<TenantID> {
    const tenantId = uuidv4();
    const tenant: TenantScope = {
      ...tenantData,
      id: tenantId,
    };

    this.registry.tenants.set(tenantId, tenant);
    this.logger.info(`Created tenant: ${tenantId}`, { tenant });
    
    return tenantId;
  }

  async getTenant(tenantId: TenantID): Promise<TenantScope | undefined> {
    return this.registry.tenants.get(tenantId);
  }

  async updateTenant(tenantId: TenantID, updates: Partial<TenantScope>): Promise<boolean> {
    const existing = this.registry.tenants.get(tenantId);
    if (!existing) {
      return false;
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.registry.tenants.set(tenantId, updated);
    this.logger.info(`Updated tenant: ${tenantId}`, { updates });
    
    return true;
  }

  async deleteTenant(tenantId: TenantID): Promise<boolean> {
    const deleted = this.registry.tenants.delete(tenantId);
    if (deleted) {
      this.logger.info(`Deleted tenant: ${tenantId}`);
    }
    return deleted;
  }

  // Server Management
  async registerServer(serverId: ServerID, serverData: AllowedServers): Promise<void> {
    this.registry.serverAllowlist.set(serverId, serverData);
    this.logger.info(`Registered server: ${serverId}`, { serverData });
  }

  async getServer(serverId: ServerID): Promise<AllowedServers | undefined> {
    return this.registry.serverAllowlist.get(serverId);
  }

  async unregisterServer(serverId: ServerID): Promise<boolean> {
    const deleted = this.registry.serverAllowlist.delete(serverId);
    if (deleted) {
      this.logger.info(`Unregistered server: ${serverId}`);
    }
    return deleted;
  }

  // Capability Management
  async bindCapability(roleId: RoleID, capability: CapabilityScope): Promise<void> {
    this.registry.capabilityBindings.set(roleId, capability);
    this.logger.info(`Bound capability to role: ${roleId}`, { capability });
  }

  async getCapability(roleId: RoleID): Promise<CapabilityScope | undefined> {
    return this.registry.capabilityBindings.get(roleId);
  }

  async unbindCapability(roleId: RoleID): Promise<boolean> {
    const deleted = this.registry.capabilityBindings.delete(roleId);
    if (deleted) {
      this.logger.info(`Unbound capability from role: ${roleId}`);
    }
    return deleted;
  }

  // Policy Management  
  async createPolicy(policyData: Omit<GovernancePolicy, 'policyId'>): Promise<PolicyID> {
    const policyId = uuidv4();
    const policy: GovernancePolicy = {
      ...policyData,
      policyId,
    };

    this.registry.policyRules.set(policyId, policy);
    this.logger.info(`Created policy: ${policyId}`, { policy });
    
    return policyId;
  }

  async getPolicy(policyId: PolicyID): Promise<GovernancePolicy | undefined> {
    return this.registry.policyRules.get(policyId);
  }

  async updatePolicy(policyId: PolicyID, updates: Partial<GovernancePolicy>): Promise<boolean> {
    const existing = this.registry.policyRules.get(policyId);
    if (!existing) {
      return false;
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.registry.policyRules.set(policyId, updated);
    this.logger.info(`Updated policy: ${policyId}`, { updates });
    
    return true;
  }

  // Access Validation
  async validateToolAccess(params: {
    tenantId: TenantID;
    roleId: RoleID;
    serverId: ServerID;
    toolName: string;
  }): Promise<AccessValidationResult> {
    const { tenantId, roleId, serverId, toolName } = params;

    // Check tenant exists and is active
    const tenant = this.registry.tenants.get(tenantId);
    if (!tenant) {
      return {
        allowed: false,
        reason: 'Tenant not found'
      };
    }

    // Check server is allowed for tenant
    if (!tenant.allowedServers.includes(serverId)) {
      return {
        allowed: false,
        reason: 'Server not allowed for tenant'
      };
    }

    // Check role is allowed for tenant
    if (!tenant.allowedRoles.includes(roleId)) {
      return {
        allowed: false,
        reason: 'Role not allowed for tenant'
      };
    }

    // Check server configuration
    const serverConfig = this.registry.serverAllowlist.get(serverId);
    if (!serverConfig) {
      return {
        allowed: false,
        reason: 'Server not registered'
      };
    }

    // Check tool is allowed on server
    if (!serverConfig.allowedTools.includes(toolName)) {
      return {
        allowed: false,
        reason: 'Tool not allowed on server'
      };
    }

    // Check capability bindings
    const capability = this.registry.capabilityBindings.get(roleId);
    if (!capability) {
      return {
        allowed: false,
        reason: 'No capability binding for role'
      };
    }

    // Check tool scope
    const toolScope = capability.toolScopes.find(ts => ts.toolName === toolName);
    if (!toolScope) {
      return {
        allowed: false,
        reason: 'Tool not in role capability scope'
      };
    }

    // Check if approval is required
    const requiresApproval = capability.approvalRequired.includes(toolName);
    
    this.logger.debug('Access validation completed', {
      tenantId,
      roleId, 
      serverId,
      toolName,
      allowed: true,
      requiresApproval
    });

    return {
      allowed: true,
      requiredApprovals: requiresApproval ? ['supervisor'] : undefined,
      constraints: toolScope.constraints
    };
  }

  // Registry Statistics
  getRegistryStats() {
    return {
      tenantCount: this.registry.tenants.size,
      serverCount: this.registry.serverAllowlist.size,
      capabilityCount: this.registry.capabilityBindings.size,
      policyCount: this.registry.policyRules.size,
    };
  }

  // Export registry for backup/migration
  exportRegistry(): ForgeRegistry {
    return {
      tenants: new Map(this.registry.tenants),
      serverAllowlist: new Map(this.registry.serverAllowlist),
      capabilityBindings: new Map(this.registry.capabilityBindings),
      policyRules: new Map(this.registry.policyRules),
    };
  }

  // Import registry from backup
  importRegistry(registry: ForgeRegistry): void {
    this.registry = {
      tenants: new Map(registry.tenants),
      serverAllowlist: new Map(registry.serverAllowlist),
      capabilityBindings: new Map(registry.capabilityBindings), 
      policyRules: new Map(registry.policyRules),
    };
    
    this.logger.info('Registry imported', this.getRegistryStats());
  }
}
