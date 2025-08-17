import { z } from 'zod';

// Core Registry Types
export type TenantID = string;
export type ServerID = string;
export type RoleID = string;
export type PolicyID = string;
export type BusinessDomain = string;

// Rate Limit Configuration
export const RateLimitConfigSchema = z.object({
  requestsPerMinute: z.number(),
  requestsPerHour: z.number(),
  requestsPerDay: z.number(),
  burstLimit: z.number().optional(),
});

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

// Model Tier Enumeration
export enum ModelTier {
  BASIC = 'basic',
  STANDARD = 'standard', 
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

// Tenant Scope Configuration
export const TenantScopeSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.enum(['enterprise', 'professional', 'starter']),
  samplingLimits: z.object({
    maxTokensPerDay: z.number(),
    maxCostPerMonth: z.number(),
    allowedModels: z.array(z.nativeEnum(ModelTier)),
    rateLimits: RateLimitConfigSchema,
  }),
  allowedServers: z.array(z.string()),
  allowedRoles: z.array(z.string()),
  securityPolicies: z.array(z.string()),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type TenantScope = z.infer<typeof TenantScopeSchema>;

// Server Configuration
export const AllowedServersSchema = z.object({
  serverId: z.string(),
  serverVersion: z.string(),
  trustLevel: z.enum(['trusted', 'sandboxed', 'approval-required']),
  allowedTools: z.array(z.string()),
  allowedResources: z.array(z.string()),
  allowedPrompts: z.array(z.string()),
  rateLimits: RateLimitConfigSchema,
  outputValidation: z.object({
    schemaUrl: z.string().optional(),
    maxOutputSize: z.number(),
    allowedContentTypes: z.array(z.string()),
  }),
  auditLevel: z.enum(['full', 'summary', 'none']),
});

export type AllowedServers = z.infer<typeof AllowedServersSchema>;

// Capability Scope
export const ToolScopeSchema = z.object({
  toolName: z.string(),
  permissions: z.array(z.string()),
  constraints: z.record(z.any()).optional(),
});

export const ResourceScopeSchema = z.object({
  resourceType: z.string(),
  accessLevel: z.enum(['read', 'write', 'admin']),
  constraints: z.record(z.any()).optional(),
});

export const PromptScopeSchema = z.object({
  promptType: z.string(),
  maxTokens: z.number(),
  allowedModels: z.array(z.string()),
});

export const EscalationRuleSchema = z.object({
  condition: z.string(),
  escalateTo: z.string(),
  timeoutMinutes: z.number(),
});

export const CapabilityScopeSchema = z.object({
  roleId: z.string(),
  roleName: z.string(),
  businessDomain: z.string(),
  toolScopes: z.array(ToolScopeSchema),
  resourceScopes: z.array(ResourceScopeSchema),
  promptScopes: z.array(PromptScopeSchema),
  maxConcurrentActions: z.number(),
  approvalRequired: z.array(z.string()),
  escalationRules: z.array(EscalationRuleSchema),
});

export type ToolScope = z.infer<typeof ToolScopeSchema>;
export type ResourceScope = z.infer<typeof ResourceScopeSchema>;
export type PromptScope = z.infer<typeof PromptScopeSchema>;
export type EscalationRule = z.infer<typeof EscalationRuleSchema>;
export type CapabilityScope = z.infer<typeof CapabilityScopeSchema>;

// Governance Policy
export const PolicyTriggerSchema = z.object({
  event: z.string(),
  conditions: z.record(z.any()),
});

export const PolicyConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'regex']),
  value: z.any(),
});

export const PolicyActionSchema = z.object({
  type: z.enum(['block', 'approve', 'log', 'notify', 'escalate']),
  parameters: z.record(z.any()).optional(),
});

export const ApproverRoleSchema = z.object({
  roleId: z.string(),
  required: z.boolean(),
  timeoutMinutes: z.number().optional(),
});

export const AuditRequirementSchema = z.object({
  level: z.enum(['basic', 'detailed', 'forensic']),
  retention: z.string(),
  fields: z.array(z.string()),
});

export const GovernancePolicySchema = z.object({
  policyId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  triggers: z.array(PolicyTriggerSchema),
  conditions: z.array(PolicyConditionSchema),
  actions: z.array(PolicyActionSchema),
  approvers: z.array(ApproverRoleSchema),
  auditRequirements: z.array(AuditRequirementSchema),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type PolicyTrigger = z.infer<typeof PolicyTriggerSchema>;
export type PolicyCondition = z.infer<typeof PolicyConditionSchema>;
export type PolicyAction = z.infer<typeof PolicyActionSchema>;
export type ApproverRole = z.infer<typeof ApproverRoleSchema>;
export type AuditRequirement = z.infer<typeof AuditRequirementSchema>;
export type GovernancePolicy = z.infer<typeof GovernancePolicySchema>;

// Main Registry Interface
export interface ForgeRegistry {
  tenants: Map<TenantID, TenantScope>;
  serverAllowlist: Map<ServerID, AllowedServers>;
  capabilityBindings: Map<RoleID, CapabilityScope>;
  policyRules: Map<PolicyID, GovernancePolicy>;
}

// Access Validation Result
export interface AccessValidationResult {
  allowed: boolean;
  reason?: string;
  requiredApprovals?: string[];
  constraints?: Record<string, any>;
}
