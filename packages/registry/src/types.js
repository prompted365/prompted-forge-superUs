"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernancePolicySchema = exports.AuditRequirementSchema = exports.ApproverRoleSchema = exports.PolicyActionSchema = exports.PolicyConditionSchema = exports.PolicyTriggerSchema = exports.CapabilityScopeSchema = exports.EscalationRuleSchema = exports.PromptScopeSchema = exports.ResourceScopeSchema = exports.ToolScopeSchema = exports.AllowedServersSchema = exports.TenantScopeSchema = exports.ModelTier = exports.RateLimitConfigSchema = void 0;
const zod_1 = require("zod");
// Rate Limit Configuration
exports.RateLimitConfigSchema = zod_1.z.object({
    requestsPerMinute: zod_1.z.number(),
    requestsPerHour: zod_1.z.number(),
    requestsPerDay: zod_1.z.number(),
    burstLimit: zod_1.z.number().optional(),
});
// Model Tier Enumeration
var ModelTier;
(function (ModelTier) {
    ModelTier["BASIC"] = "basic";
    ModelTier["STANDARD"] = "standard";
    ModelTier["PREMIUM"] = "premium";
    ModelTier["ENTERPRISE"] = "enterprise";
})(ModelTier || (exports.ModelTier = ModelTier = {}));
// Tenant Scope Configuration
exports.TenantScopeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    tier: zod_1.z.enum(['enterprise', 'professional', 'starter']),
    samplingLimits: zod_1.z.object({
        maxTokensPerDay: zod_1.z.number(),
        maxCostPerMonth: zod_1.z.number(),
        allowedModels: zod_1.z.array(zod_1.z.nativeEnum(ModelTier)),
        rateLimits: exports.RateLimitConfigSchema,
    }),
    allowedServers: zod_1.z.array(zod_1.z.string()),
    allowedRoles: zod_1.z.array(zod_1.z.string()),
    securityPolicies: zod_1.z.array(zod_1.z.string()),
    createdAt: zod_1.z.date().default(() => new Date()),
    updatedAt: zod_1.z.date().default(() => new Date()),
});
// Server Configuration
exports.AllowedServersSchema = zod_1.z.object({
    serverId: zod_1.z.string(),
    serverVersion: zod_1.z.string(),
    trustLevel: zod_1.z.enum(['trusted', 'sandboxed', 'approval-required']),
    allowedTools: zod_1.z.array(zod_1.z.string()),
    allowedResources: zod_1.z.array(zod_1.z.string()),
    allowedPrompts: zod_1.z.array(zod_1.z.string()),
    rateLimits: exports.RateLimitConfigSchema,
    outputValidation: zod_1.z.object({
        schemaUrl: zod_1.z.string().optional(),
        maxOutputSize: zod_1.z.number(),
        allowedContentTypes: zod_1.z.array(zod_1.z.string()),
    }),
    auditLevel: zod_1.z.enum(['full', 'summary', 'none']),
});
// Capability Scope
exports.ToolScopeSchema = zod_1.z.object({
    toolName: zod_1.z.string(),
    permissions: zod_1.z.array(zod_1.z.string()),
    constraints: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.ResourceScopeSchema = zod_1.z.object({
    resourceType: zod_1.z.string(),
    accessLevel: zod_1.z.enum(['read', 'write', 'admin']),
    constraints: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.PromptScopeSchema = zod_1.z.object({
    promptType: zod_1.z.string(),
    maxTokens: zod_1.z.number(),
    allowedModels: zod_1.z.array(zod_1.z.string()),
});
exports.EscalationRuleSchema = zod_1.z.object({
    condition: zod_1.z.string(),
    escalateTo: zod_1.z.string(),
    timeoutMinutes: zod_1.z.number(),
});
exports.CapabilityScopeSchema = zod_1.z.object({
    roleId: zod_1.z.string(),
    roleName: zod_1.z.string(),
    businessDomain: zod_1.z.string(),
    toolScopes: zod_1.z.array(exports.ToolScopeSchema),
    resourceScopes: zod_1.z.array(exports.ResourceScopeSchema),
    promptScopes: zod_1.z.array(exports.PromptScopeSchema),
    maxConcurrentActions: zod_1.z.number(),
    approvalRequired: zod_1.z.array(zod_1.z.string()),
    escalationRules: zod_1.z.array(exports.EscalationRuleSchema),
});
// Governance Policy
exports.PolicyTriggerSchema = zod_1.z.object({
    event: zod_1.z.string(),
    conditions: zod_1.z.record(zod_1.z.any()),
});
exports.PolicyConditionSchema = zod_1.z.object({
    field: zod_1.z.string(),
    operator: zod_1.z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'regex']),
    value: zod_1.z.any(),
});
exports.PolicyActionSchema = zod_1.z.object({
    type: zod_1.z.enum(['block', 'approve', 'log', 'notify', 'escalate']),
    parameters: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.ApproverRoleSchema = zod_1.z.object({
    roleId: zod_1.z.string(),
    required: zod_1.z.boolean(),
    timeoutMinutes: zod_1.z.number().optional(),
});
exports.AuditRequirementSchema = zod_1.z.object({
    level: zod_1.z.enum(['basic', 'detailed', 'forensic']),
    retention: zod_1.z.string(),
    fields: zod_1.z.array(zod_1.z.string()),
});
exports.GovernancePolicySchema = zod_1.z.object({
    policyId: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    triggers: zod_1.z.array(exports.PolicyTriggerSchema),
    conditions: zod_1.z.array(exports.PolicyConditionSchema),
    actions: zod_1.z.array(exports.PolicyActionSchema),
    approvers: zod_1.z.array(exports.ApproverRoleSchema),
    auditRequirements: zod_1.z.array(exports.AuditRequirementSchema),
    isActive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.date().default(() => new Date()),
    updatedAt: zod_1.z.date().default(() => new Date()),
});
//# sourceMappingURL=types.js.map