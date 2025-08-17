import { performance } from 'perf_hooks';
import {
  PolicyEvaluationResult,
  PolicyEvaluationInput,
  PolicyFrameworkConfig,
  PolicyDecision,
  PolicyActionType,
  PolicyEvaluationResultSchema,
} from '../types/policy';
import { logger } from '../telemetry';

/**
 * Policy Framework v1
 * Handles retention, compression, safety, and access control policies
 * All features are gated behind PF_POLICIES_ENABLED environment variable
 */
export class PolicyFramework {
  private config: PolicyFrameworkConfig;
  private enabled: boolean;

  constructor(config?: Partial<PolicyFrameworkConfig>) {
    this.enabled = process.env.PF_POLICIES_ENABLED === 'true';
    
    this.config = {
      enabled: this.enabled,
      retention: {
        enabled: true,
        defaultDays: parseInt(process.env.PF_POLICY_RETENTION_DAYS_DEFAULT || '30', 10),
        maxDays: 365,
        byContentType: config?.retention?.byContentType,
      },
      compression: {
        enabled: false,
        minLengthChars: parseInt(process.env.PF_POLICY_COMPRESSION_MIN_LEN || '800', 10),
        compressionRatio: 0.7,
        algorithm: 'stub',
      },
      safety: {
        enabled: true,
        mode: (process.env.PF_POLICY_SAFETY_MODE as 'passive' | 'strict') || 'passive',
        blockedCategories: [],
        redactPatterns: [
          // Basic PII patterns
          '\\b\\d{3}-\\d{2}-\\d{4}\\b', // SSN
          '\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b', // Credit card
          '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', // Email (basic)
        ],
        allowOverride: true,
      },
      accessControl: {
        enabled: false,
        tierAllowlist: config?.accessControl?.tierAllowlist,
        tierDenylist: config?.accessControl?.tierDenylist,
        requireAuth: false,
      },
      evaluationTimeoutMs: config?.evaluationTimeoutMs ?? 50,
      ...config,
    };

    if (this.enabled) {
      logger.info('Policy Framework v1 initialized', {
        config: this.sanitizeConfigForLogging(this.config),
        version: '1.0',
      });
    }
  }

  /**
   * Evaluate policies for a given input
   * Returns policy decisions when enabled, stub when disabled
   */
  async evaluate(input: PolicyEvaluationInput): Promise<PolicyEvaluationResult> {
    const startTime = performance.now();

    try {
      if (!this.enabled) {
        return this.createStubEvaluation(input, performance.now() - startTime);
      }

      const decisions: PolicyDecision[] = [];
      const appliedRules: string[] = [];

      // Evaluate each policy type
      await Promise.all([
        this.evaluateRetentionPolicy(input, decisions, appliedRules),
        this.evaluateCompressionPolicy(input, decisions, appliedRules),
        this.evaluateSafetyPolicy(input, decisions, appliedRules),
        this.evaluateAccessControlPolicy(input, decisions, appliedRules),
      ]);

      const evaluationMs = performance.now() - startTime;
      const finalAction = this.determineFinalAction(decisions);

      const result: PolicyEvaluationResult = {
        decisions,
        finalAction,
        evaluationMs,
        appliedRules,
        frameworkVersion: '1.0',
        metadata: {
          evaluatedPolicies: ['retention', 'compression', 'safety', 'accessControl'],
        },
      };

      // Validate result
      const validated = PolicyEvaluationResultSchema.parse(result);

      logger.debug('Policy evaluation completed', {
        requestId: input.requestId,
        finalAction: validated.finalAction,
        decisionsCount: validated.decisions.length,
        appliedRulesCount: validated.appliedRules.length,
        evaluationMs: validated.evaluationMs,
      });

      return validated;
    } catch (error) {
      logger.error('Policy evaluation failed', {
        error: error instanceof Error ? error.message : String(error),
        requestId: input.requestId,
        evaluationMs: performance.now() - startTime,
      });

      // Return safe fallback
      return this.createStubEvaluation(input, performance.now() - startTime);
    }
  }

  /**
   * Create stub evaluation when framework is disabled or on error
   */
  private createStubEvaluation(_input: PolicyEvaluationInput, evaluationMs: number): PolicyEvaluationResult {
    return {
      decisions: [{
        ruleId: 'stub-allow',
        ruleName: 'Default Allow (Policies Disabled)',
        action: 'allow',
        confidence: 1.0,
        reason: 'Policy framework disabled',
      }],
      finalAction: 'allow',
      evaluationMs,
      appliedRules: ['stub-allow'],
      frameworkVersion: '1.0',
      metadata: { stub: true },
    };
  }

  /**
   * Evaluate retention policy
   */
  private async evaluateRetentionPolicy(
    input: PolicyEvaluationInput,
    decisions: PolicyDecision[],
    appliedRules: string[]
  ): Promise<void> {
    if (!this.config.retention.enabled) return;

    const retentionDays = this.config.retention.byContentType?.[input.metadata?.contentType as string] 
      ?? this.config.retention.defaultDays;

    decisions.push({
      ruleId: 'retention-default',
      ruleName: `Retention Policy - ${retentionDays} days`,
      action: 'retain',
      confidence: 1.0,
      reason: `Content will be retained for ${retentionDays} days`,
      metadata: { retentionDays },
    });

    appliedRules.push('retention-default');
  }

  /**
   * Evaluate compression policy
   */
  private async evaluateCompressionPolicy(
    input: PolicyEvaluationInput,
    decisions: PolicyDecision[],
    appliedRules: string[]
  ): Promise<void> {
    if (!this.config.compression.enabled || !input.content) return;

    const contentLength = input.content.length;

    if (contentLength >= this.config.compression.minLengthChars) {
      decisions.push({
        ruleId: 'compression-length',
        ruleName: `Compression Policy - Min Length ${this.config.compression.minLengthChars}`,
        action: 'compress',
        confidence: 0.8,
        reason: `Content length ${contentLength} exceeds compression threshold`,
        metadata: {
          algorithm: this.config.compression.algorithm,
          compressionRatio: this.config.compression.compressionRatio,
        },
      });

      appliedRules.push('compression-length');
    }
  }

  /**
   * Evaluate safety policy
   */
  private async evaluateSafetyPolicy(
    input: PolicyEvaluationInput,
    decisions: PolicyDecision[],
    appliedRules: string[]
  ): Promise<void> {
    if (!this.config.safety.enabled || !input.content) return;

    const content = input.content;
    let hasSensitiveContent = false;
    const detectedPatterns: string[] = [];

    // Check for PII patterns
    for (const pattern of this.config.safety.redactPatterns) {
      const regex = new RegExp(pattern, 'gi');
      if (regex.test(content)) {
        hasSensitiveContent = true;
        detectedPatterns.push(pattern);
      }
    }

    if (hasSensitiveContent) {
      const action: PolicyActionType = this.config.safety.mode === 'strict' ? 'deny' : 'redact';
      
      decisions.push({
        ruleId: 'safety-pii',
        ruleName: `Safety Policy - PII Detection (${this.config.safety.mode} mode)`,
        action,
        confidence: 0.9,
        reason: `Detected potential PII patterns: ${detectedPatterns.length} matches`,
        metadata: {
          mode: this.config.safety.mode,
          detectedPatternCount: detectedPatterns.length,
          allowOverride: this.config.safety.allowOverride,
        },
      });

      appliedRules.push('safety-pii');
    }
  }

  /**
   * Evaluate access control policy
   */
  private async evaluateAccessControlPolicy(
    input: PolicyEvaluationInput,
    decisions: PolicyDecision[],
    appliedRules: string[]
  ): Promise<void> {
    if (!this.config.accessControl.enabled) return;

    const tier = input.tier || 'default';
    const operation = input.operation;

    // Check tier allowlist
    if (this.config.accessControl.tierAllowlist?.[tier]) {
      const allowedOps = this.config.accessControl.tierAllowlist[tier];
      if (!allowedOps.includes(operation)) {
        decisions.push({
          ruleId: 'access-control-allowlist',
          ruleName: `Access Control - Tier Allowlist`,
          action: 'deny',
          confidence: 1.0,
          reason: `Operation '${operation}' not in allowlist for tier '${tier}'`,
          metadata: { tier, operation, allowedOperations: allowedOps },
        });

        appliedRules.push('access-control-allowlist');
        return;
      }
    }

    // Check tier denylist
    if (this.config.accessControl.tierDenylist?.[tier]) {
      const deniedOps = this.config.accessControl.tierDenylist[tier];
      if (deniedOps.includes(operation)) {
        decisions.push({
          ruleId: 'access-control-denylist',
          ruleName: `Access Control - Tier Denylist`,
          action: 'deny',
          confidence: 1.0,
          reason: `Operation '${operation}' is in denylist for tier '${tier}'`,
          metadata: { tier, operation, deniedOperations: deniedOps },
        });

        appliedRules.push('access-control-denylist');
        return;
      }
    }

    // Auth requirement check
    if (this.config.accessControl.requireAuth && !input.userId) {
      decisions.push({
        ruleId: 'access-control-auth',
        ruleName: `Access Control - Authentication Required`,
        action: 'deny',
        confidence: 1.0,
        reason: `Authentication required but no user ID provided`,
        metadata: { requireAuth: true },
      });

      appliedRules.push('access-control-auth');
    }
  }

  /**
   * Determine final action from all policy decisions
   * Priority: deny > escalate > redact > compress > retain > allow
   */
  private determineFinalAction(decisions: PolicyDecision[]): PolicyActionType {
    if (decisions.length === 0) return 'allow';

    const actionPriority: Record<PolicyActionType, number> = {
      deny: 6,
      escalate: 5,
      redact: 4,
      throttle: 3,
      compress: 2,
      retain: 1,
      allow: 0,
    };

    let highestPriorityAction: PolicyActionType = 'allow';
    let highestPriority = 0;

    for (const decision of decisions) {
      const priority = actionPriority[decision.action];
      if (priority > highestPriority) {
        highestPriority = priority;
        highestPriorityAction = decision.action;
      }
    }

    return highestPriorityAction;
  }

  /**
   * Sanitize config for logging (remove sensitive data)
   */
  private sanitizeConfigForLogging(config: PolicyFrameworkConfig): Partial<PolicyFrameworkConfig> {
    return {
      enabled: config.enabled,
      retention: {
        enabled: config.retention.enabled,
        defaultDays: config.retention.defaultDays,
        maxDays: config.retention.maxDays,
      },
      compression: {
        enabled: config.compression.enabled,
        minLengthChars: config.compression.minLengthChars,
        algorithm: config.compression.algorithm,
        compressionRatio: config.compression.compressionRatio,
      },
      safety: {
        enabled: config.safety.enabled,
        mode: config.safety.mode,
        blockedCategories: config.safety.blockedCategories,
        redactPatterns: config.safety.redactPatterns,
        allowOverride: config.safety.allowOverride,
      },
      accessControl: {
        enabled: config.accessControl.enabled,
        requireAuth: config.accessControl.requireAuth,
      },
      evaluationTimeoutMs: config.evaluationTimeoutMs,
    };
  }

  /**
   * Check if policy framework is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current configuration (sanitized)
   */
  getConfig(): Partial<PolicyFrameworkConfig> {
    return this.sanitizeConfigForLogging(this.config);
  }
}
