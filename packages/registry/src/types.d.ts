import { z } from 'zod';
export type TenantID = string;
export type ServerID = string;
export type RoleID = string;
export type PolicyID = string;
export type BusinessDomain = string;
export declare const RateLimitConfigSchema: z.ZodObject<{
    requestsPerMinute: z.ZodNumber;
    requestsPerHour: z.ZodNumber;
    requestsPerDay: z.ZodNumber;
    burstLimit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    burstLimit?: number | undefined;
}, {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    burstLimit?: number | undefined;
}>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export declare enum ModelTier {
    BASIC = "basic",
    STANDARD = "standard",
    PREMIUM = "premium",
    ENTERPRISE = "enterprise"
}
export declare const TenantScopeSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    tier: z.ZodEnum<["enterprise", "professional", "starter"]>;
    samplingLimits: z.ZodObject<{
        maxTokensPerDay: z.ZodNumber;
        maxCostPerMonth: z.ZodNumber;
        allowedModels: z.ZodArray<z.ZodNativeEnum<typeof ModelTier>, "many">;
        rateLimits: z.ZodObject<{
            requestsPerMinute: z.ZodNumber;
            requestsPerHour: z.ZodNumber;
            requestsPerDay: z.ZodNumber;
            burstLimit: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            requestsPerMinute: number;
            requestsPerHour: number;
            requestsPerDay: number;
            burstLimit?: number | undefined;
        }, {
            requestsPerMinute: number;
            requestsPerHour: number;
            requestsPerDay: number;
            burstLimit?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        maxTokensPerDay: number;
        maxCostPerMonth: number;
        allowedModels: ModelTier[];
        rateLimits: {
            requestsPerMinute: number;
            requestsPerHour: number;
            requestsPerDay: number;
            burstLimit?: number | undefined;
        };
    }, {
        maxTokensPerDay: number;
        maxCostPerMonth: number;
        allowedModels: ModelTier[];
        rateLimits: {
            requestsPerMinute: number;
            requestsPerHour: number;
            requestsPerDay: number;
            burstLimit?: number | undefined;
        };
    }>;
    allowedServers: z.ZodArray<z.ZodString, "many">;
    allowedRoles: z.ZodArray<z.ZodString, "many">;
    securityPolicies: z.ZodArray<z.ZodString, "many">;
    createdAt: z.ZodDefault<z.ZodDate>;
    updatedAt: z.ZodDefault<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    tier: "enterprise" | "professional" | "starter";
    samplingLimits: {
        maxTokensPerDay: number;
        maxCostPerMonth: number;
        allowedModels: ModelTier[];
        rateLimits: {
            requestsPerMinute: number;
            requestsPerHour: number;
            requestsPerDay: number;
            burstLimit?: number | undefined;
        };
    };
    allowedServers: string[];
    allowedRoles: string[];
    securityPolicies: string[];
    createdAt: Date;
    updatedAt: Date;
}, {
    id: string;
    name: string;
    tier: "enterprise" | "professional" | "starter";
    samplingLimits: {
        maxTokensPerDay: number;
        maxCostPerMonth: number;
        allowedModels: ModelTier[];
        rateLimits: {
            requestsPerMinute: number;
            requestsPerHour: number;
            requestsPerDay: number;
            burstLimit?: number | undefined;
        };
    };
    allowedServers: string[];
    allowedRoles: string[];
    securityPolicies: string[];
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}>;
export type TenantScope = z.infer<typeof TenantScopeSchema>;
export declare const AllowedServersSchema: z.ZodObject<{
    serverId: z.ZodString;
    serverVersion: z.ZodString;
    trustLevel: z.ZodEnum<["trusted", "sandboxed", "approval-required"]>;
    allowedTools: z.ZodArray<z.ZodString, "many">;
    allowedResources: z.ZodArray<z.ZodString, "many">;
    allowedPrompts: z.ZodArray<z.ZodString, "many">;
    rateLimits: z.ZodObject<{
        requestsPerMinute: z.ZodNumber;
        requestsPerHour: z.ZodNumber;
        requestsPerDay: z.ZodNumber;
        burstLimit: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        requestsPerMinute: number;
        requestsPerHour: number;
        requestsPerDay: number;
        burstLimit?: number | undefined;
    }, {
        requestsPerMinute: number;
        requestsPerHour: number;
        requestsPerDay: number;
        burstLimit?: number | undefined;
    }>;
    outputValidation: z.ZodObject<{
        schemaUrl: z.ZodOptional<z.ZodString>;
        maxOutputSize: z.ZodNumber;
        allowedContentTypes: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        maxOutputSize: number;
        allowedContentTypes: string[];
        schemaUrl?: string | undefined;
    }, {
        maxOutputSize: number;
        allowedContentTypes: string[];
        schemaUrl?: string | undefined;
    }>;
    auditLevel: z.ZodEnum<["full", "summary", "none"]>;
}, "strip", z.ZodTypeAny, {
    serverId: string;
    rateLimits: {
        requestsPerMinute: number;
        requestsPerHour: number;
        requestsPerDay: number;
        burstLimit?: number | undefined;
    };
    serverVersion: string;
    trustLevel: "trusted" | "sandboxed" | "approval-required";
    allowedTools: string[];
    allowedResources: string[];
    allowedPrompts: string[];
    outputValidation: {
        maxOutputSize: number;
        allowedContentTypes: string[];
        schemaUrl?: string | undefined;
    };
    auditLevel: "full" | "summary" | "none";
}, {
    serverId: string;
    rateLimits: {
        requestsPerMinute: number;
        requestsPerHour: number;
        requestsPerDay: number;
        burstLimit?: number | undefined;
    };
    serverVersion: string;
    trustLevel: "trusted" | "sandboxed" | "approval-required";
    allowedTools: string[];
    allowedResources: string[];
    allowedPrompts: string[];
    outputValidation: {
        maxOutputSize: number;
        allowedContentTypes: string[];
        schemaUrl?: string | undefined;
    };
    auditLevel: "full" | "summary" | "none";
}>;
export type AllowedServers = z.infer<typeof AllowedServersSchema>;
export declare const ToolScopeSchema: z.ZodObject<{
    toolName: z.ZodString;
    permissions: z.ZodArray<z.ZodString, "many">;
    constraints: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    toolName: string;
    permissions: string[];
    constraints?: Record<string, any> | undefined;
}, {
    toolName: string;
    permissions: string[];
    constraints?: Record<string, any> | undefined;
}>;
export declare const ResourceScopeSchema: z.ZodObject<{
    resourceType: z.ZodString;
    accessLevel: z.ZodEnum<["read", "write", "admin"]>;
    constraints: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    resourceType: string;
    accessLevel: "read" | "write" | "admin";
    constraints?: Record<string, any> | undefined;
}, {
    resourceType: string;
    accessLevel: "read" | "write" | "admin";
    constraints?: Record<string, any> | undefined;
}>;
export declare const PromptScopeSchema: z.ZodObject<{
    promptType: z.ZodString;
    maxTokens: z.ZodNumber;
    allowedModels: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    allowedModels: string[];
    promptType: string;
    maxTokens: number;
}, {
    allowedModels: string[];
    promptType: string;
    maxTokens: number;
}>;
export declare const EscalationRuleSchema: z.ZodObject<{
    condition: z.ZodString;
    escalateTo: z.ZodString;
    timeoutMinutes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    condition: string;
    escalateTo: string;
    timeoutMinutes: number;
}, {
    condition: string;
    escalateTo: string;
    timeoutMinutes: number;
}>;
export declare const CapabilityScopeSchema: z.ZodObject<{
    roleId: z.ZodString;
    roleName: z.ZodString;
    businessDomain: z.ZodString;
    toolScopes: z.ZodArray<z.ZodObject<{
        toolName: z.ZodString;
        permissions: z.ZodArray<z.ZodString, "many">;
        constraints: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        toolName: string;
        permissions: string[];
        constraints?: Record<string, any> | undefined;
    }, {
        toolName: string;
        permissions: string[];
        constraints?: Record<string, any> | undefined;
    }>, "many">;
    resourceScopes: z.ZodArray<z.ZodObject<{
        resourceType: z.ZodString;
        accessLevel: z.ZodEnum<["read", "write", "admin"]>;
        constraints: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        resourceType: string;
        accessLevel: "read" | "write" | "admin";
        constraints?: Record<string, any> | undefined;
    }, {
        resourceType: string;
        accessLevel: "read" | "write" | "admin";
        constraints?: Record<string, any> | undefined;
    }>, "many">;
    promptScopes: z.ZodArray<z.ZodObject<{
        promptType: z.ZodString;
        maxTokens: z.ZodNumber;
        allowedModels: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        allowedModels: string[];
        promptType: string;
        maxTokens: number;
    }, {
        allowedModels: string[];
        promptType: string;
        maxTokens: number;
    }>, "many">;
    maxConcurrentActions: z.ZodNumber;
    approvalRequired: z.ZodArray<z.ZodString, "many">;
    escalationRules: z.ZodArray<z.ZodObject<{
        condition: z.ZodString;
        escalateTo: z.ZodString;
        timeoutMinutes: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        condition: string;
        escalateTo: string;
        timeoutMinutes: number;
    }, {
        condition: string;
        escalateTo: string;
        timeoutMinutes: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    roleId: string;
    roleName: string;
    businessDomain: string;
    toolScopes: {
        toolName: string;
        permissions: string[];
        constraints?: Record<string, any> | undefined;
    }[];
    resourceScopes: {
        resourceType: string;
        accessLevel: "read" | "write" | "admin";
        constraints?: Record<string, any> | undefined;
    }[];
    promptScopes: {
        allowedModels: string[];
        promptType: string;
        maxTokens: number;
    }[];
    maxConcurrentActions: number;
    approvalRequired: string[];
    escalationRules: {
        condition: string;
        escalateTo: string;
        timeoutMinutes: number;
    }[];
}, {
    roleId: string;
    roleName: string;
    businessDomain: string;
    toolScopes: {
        toolName: string;
        permissions: string[];
        constraints?: Record<string, any> | undefined;
    }[];
    resourceScopes: {
        resourceType: string;
        accessLevel: "read" | "write" | "admin";
        constraints?: Record<string, any> | undefined;
    }[];
    promptScopes: {
        allowedModels: string[];
        promptType: string;
        maxTokens: number;
    }[];
    maxConcurrentActions: number;
    approvalRequired: string[];
    escalationRules: {
        condition: string;
        escalateTo: string;
        timeoutMinutes: number;
    }[];
}>;
export type ToolScope = z.infer<typeof ToolScopeSchema>;
export type ResourceScope = z.infer<typeof ResourceScopeSchema>;
export type PromptScope = z.infer<typeof PromptScopeSchema>;
export type EscalationRule = z.infer<typeof EscalationRuleSchema>;
export type CapabilityScope = z.infer<typeof CapabilityScopeSchema>;
export declare const PolicyTriggerSchema: z.ZodObject<{
    event: z.ZodString;
    conditions: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    event: string;
    conditions: Record<string, any>;
}, {
    event: string;
    conditions: Record<string, any>;
}>;
export declare const PolicyConditionSchema: z.ZodObject<{
    field: z.ZodString;
    operator: z.ZodEnum<["eq", "neq", "gt", "gte", "lt", "lte", "contains", "regex"]>;
    value: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    field: string;
    operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "regex";
    value?: any;
}, {
    field: string;
    operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "regex";
    value?: any;
}>;
export declare const PolicyActionSchema: z.ZodObject<{
    type: z.ZodEnum<["block", "approve", "log", "notify", "escalate"]>;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "block" | "approve" | "log" | "notify" | "escalate";
    parameters?: Record<string, any> | undefined;
}, {
    type: "block" | "approve" | "log" | "notify" | "escalate";
    parameters?: Record<string, any> | undefined;
}>;
export declare const ApproverRoleSchema: z.ZodObject<{
    roleId: z.ZodString;
    required: z.ZodBoolean;
    timeoutMinutes: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    roleId: string;
    required: boolean;
    timeoutMinutes?: number | undefined;
}, {
    roleId: string;
    required: boolean;
    timeoutMinutes?: number | undefined;
}>;
export declare const AuditRequirementSchema: z.ZodObject<{
    level: z.ZodEnum<["basic", "detailed", "forensic"]>;
    retention: z.ZodString;
    fields: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    level: "basic" | "detailed" | "forensic";
    retention: string;
    fields: string[];
}, {
    level: "basic" | "detailed" | "forensic";
    retention: string;
    fields: string[];
}>;
export declare const GovernancePolicySchema: z.ZodObject<{
    policyId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    triggers: z.ZodArray<z.ZodObject<{
        event: z.ZodString;
        conditions: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        event: string;
        conditions: Record<string, any>;
    }, {
        event: string;
        conditions: Record<string, any>;
    }>, "many">;
    conditions: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        operator: z.ZodEnum<["eq", "neq", "gt", "gte", "lt", "lte", "contains", "regex"]>;
        value: z.ZodAny;
    }, "strip", z.ZodTypeAny, {
        field: string;
        operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "regex";
        value?: any;
    }, {
        field: string;
        operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "regex";
        value?: any;
    }>, "many">;
    actions: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["block", "approve", "log", "notify", "escalate"]>;
        parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type: "block" | "approve" | "log" | "notify" | "escalate";
        parameters?: Record<string, any> | undefined;
    }, {
        type: "block" | "approve" | "log" | "notify" | "escalate";
        parameters?: Record<string, any> | undefined;
    }>, "many">;
    approvers: z.ZodArray<z.ZodObject<{
        roleId: z.ZodString;
        required: z.ZodBoolean;
        timeoutMinutes: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        roleId: string;
        required: boolean;
        timeoutMinutes?: number | undefined;
    }, {
        roleId: string;
        required: boolean;
        timeoutMinutes?: number | undefined;
    }>, "many">;
    auditRequirements: z.ZodArray<z.ZodObject<{
        level: z.ZodEnum<["basic", "detailed", "forensic"]>;
        retention: z.ZodString;
        fields: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        level: "basic" | "detailed" | "forensic";
        retention: string;
        fields: string[];
    }, {
        level: "basic" | "detailed" | "forensic";
        retention: string;
        fields: string[];
    }>, "many">;
    isActive: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodDefault<z.ZodDate>;
    updatedAt: z.ZodDefault<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    name: string;
    createdAt: Date;
    updatedAt: Date;
    conditions: {
        field: string;
        operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "regex";
        value?: any;
    }[];
    policyId: string;
    triggers: {
        event: string;
        conditions: Record<string, any>;
    }[];
    actions: {
        type: "block" | "approve" | "log" | "notify" | "escalate";
        parameters?: Record<string, any> | undefined;
    }[];
    approvers: {
        roleId: string;
        required: boolean;
        timeoutMinutes?: number | undefined;
    }[];
    auditRequirements: {
        level: "basic" | "detailed" | "forensic";
        retention: string;
        fields: string[];
    }[];
    isActive: boolean;
    description?: string | undefined;
}, {
    name: string;
    conditions: {
        field: string;
        operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "regex";
        value?: any;
    }[];
    policyId: string;
    triggers: {
        event: string;
        conditions: Record<string, any>;
    }[];
    actions: {
        type: "block" | "approve" | "log" | "notify" | "escalate";
        parameters?: Record<string, any> | undefined;
    }[];
    approvers: {
        roleId: string;
        required: boolean;
        timeoutMinutes?: number | undefined;
    }[];
    auditRequirements: {
        level: "basic" | "detailed" | "forensic";
        retention: string;
        fields: string[];
    }[];
    description?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    isActive?: boolean | undefined;
}>;
export type PolicyTrigger = z.infer<typeof PolicyTriggerSchema>;
export type PolicyCondition = z.infer<typeof PolicyConditionSchema>;
export type PolicyAction = z.infer<typeof PolicyActionSchema>;
export type ApproverRole = z.infer<typeof ApproverRoleSchema>;
export type AuditRequirement = z.infer<typeof AuditRequirementSchema>;
export type GovernancePolicy = z.infer<typeof GovernancePolicySchema>;
export interface ForgeRegistry {
    tenants: Map<TenantID, TenantScope>;
    serverAllowlist: Map<ServerID, AllowedServers>;
    capabilityBindings: Map<RoleID, CapabilityScope>;
    policyRules: Map<PolicyID, GovernancePolicy>;
}
export interface AccessValidationResult {
    allowed: boolean;
    reason?: string;
    requiredApprovals?: string[];
    constraints?: Record<string, any>;
}
//# sourceMappingURL=types.d.ts.map