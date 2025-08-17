import winston from 'winston';
import { ForgeRegistry, TenantScope, AllowedServers, CapabilityScope, GovernancePolicy, AccessValidationResult, TenantID, ServerID, RoleID, PolicyID } from '../types';
export declare class CapabilityRegistryManager {
    private registry;
    private logger;
    constructor(logger: winston.Logger);
    createTenant(tenantData: Omit<TenantScope, 'id'>): Promise<TenantID>;
    getTenant(tenantId: TenantID): Promise<TenantScope | undefined>;
    updateTenant(tenantId: TenantID, updates: Partial<TenantScope>): Promise<boolean>;
    deleteTenant(tenantId: TenantID): Promise<boolean>;
    registerServer(serverId: ServerID, serverData: AllowedServers): Promise<void>;
    getServer(serverId: ServerID): Promise<AllowedServers | undefined>;
    unregisterServer(serverId: ServerID): Promise<boolean>;
    bindCapability(roleId: RoleID, capability: CapabilityScope): Promise<void>;
    getCapability(roleId: RoleID): Promise<CapabilityScope | undefined>;
    unbindCapability(roleId: RoleID): Promise<boolean>;
    createPolicy(policyData: Omit<GovernancePolicy, 'policyId'>): Promise<PolicyID>;
    getPolicy(policyId: PolicyID): Promise<GovernancePolicy | undefined>;
    updatePolicy(policyId: PolicyID, updates: Partial<GovernancePolicy>): Promise<boolean>;
    validateToolAccess(params: {
        tenantId: TenantID;
        roleId: RoleID;
        serverId: ServerID;
        toolName: string;
    }): Promise<AccessValidationResult>;
    getRegistryStats(): {
        tenantCount: number;
        serverCount: number;
        capabilityCount: number;
        policyCount: number;
    };
    exportRegistry(): ForgeRegistry;
    importRegistry(registry: ForgeRegistry): void;
}
//# sourceMappingURL=registry.d.ts.map