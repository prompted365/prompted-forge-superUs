import { z } from 'zod';

/**
 * Policy Action Types
 * Actions that policies can take on operations
 */
export const PolicyActionType = z.enum([
  'allow',          // Allow the operation
  'deny',           // Deny the operation
  'redact',         // Allow but redact sensitive content
  'compress',       // Apply compression/summarization
  'retain',         // Set retention period
  'throttle',       // Apply rate limiting
  'escalate',       // Requires manual approval
]);

export type PolicyActionType = z.infer<typeof PolicyActionType>;

/**
 * Policy Decision
 * Single decision made by a policy rule
 */
export const PolicyDecisionSchema = z.object({
  ruleId: z.string(),
  ruleName: z.string(),
  action: PolicyActionType,
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

/**
 * Retention Policy Configuration
 */
export const RetentionPolicySchema = z.object({
  enabled: z.boolean().default(true),
  defaultDays: z.number().int().min(0).default(30),
  maxDays: z.number().int().min(0).default(365),
  byContentType: z.record(z.number().int().min(0)).optional(),
});

export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;

/**
 * Compression Policy Configuration
 */
export const CompressionPolicySchema = z.object({
  enabled: z.boolean().default(false),
  minLengthChars: z.number().int().min(0).default(800),
  compressionRatio: z.number().min(0.1).max(0.9).default(0.7),
  algorithm: z.enum(['stub', 'summary', 'embeddings']).default('stub'),
});

export type CompressionPolicy = z.infer<typeof CompressionPolicySchema>;

/**
 * Safety Policy Configuration
 */
export const SafetyPolicySchema = z.object({
  enabled: z.boolean().default(true),
  mode: z.enum(['passive', 'strict']).default('passive'),
  blockedCategories: z.array(z.string()).default([]),
  redactPatterns: z.array(z.string()).default([]),
  allowOverride: z.boolean().default(true),
});

export type SafetyPolicy = z.infer<typeof SafetyPolicySchema>;

/**
 * Access Control Policy Configuration
 */
export const AccessControlPolicySchema = z.object({
  enabled: z.boolean().default(false),
  tierAllowlist: z.record(z.array(z.string())).optional(), // tier -> allowed operations
  tierDenylist: z.record(z.array(z.string())).optional(),  // tier -> denied operations
  requireAuth: z.boolean().default(false),
});

export type AccessControlPolicy = z.infer<typeof AccessControlPolicySchema>;

/**
 * Complete Policy Framework Configuration
 */
export const PolicyFrameworkConfigSchema = z.object({
  enabled: z.boolean().default(false),
  retention: RetentionPolicySchema,
  compression: CompressionPolicySchema,
  safety: SafetyPolicySchema,
  accessControl: AccessControlPolicySchema,
  evaluationTimeoutMs: z.number().int().min(0).default(50),
});

export type PolicyFrameworkConfig = z.infer<typeof PolicyFrameworkConfigSchema>;

/**
 * Policy Evaluation Result
 * Complete result of policy evaluation for an operation
 */
export const PolicyEvaluationResultSchema = z.object({
  decisions: z.array(PolicyDecisionSchema),
  finalAction: PolicyActionType,
  evaluationMs: z.number().min(0),
  appliedRules: z.array(z.string()),
  metadata: z.record(z.unknown()).optional(),
  frameworkVersion: z.string().default('1.0'),
});

export type PolicyEvaluationResult = z.infer<typeof PolicyEvaluationResultSchema>;

/**
 * Policy Evaluation Input
 */
export const PolicyEvaluationInputSchema = z.object({
  operation: z.enum(['store', 'retrieve', 'search', 'health']),
  content: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  requestId: z.string(),
  tier: z.string().optional(),
  userId: z.string().optional(),
});

export type PolicyEvaluationInput = z.infer<typeof PolicyEvaluationInputSchema>;
