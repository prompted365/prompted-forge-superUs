/**
 * Enhanced Memory Orchestrator with Context Analysis and Policy Integration
 * 
 * Extends the stub orchestrator with Phase 3.3 capabilities:
 * - Context analysis integration
 * - Policy framework integration
 * - Enhanced telemetry with analysis metrics
 * 
 * Following Homeskillet Rhythm™: Build on proven foundations
 */

import winston from 'winston';
import { performance } from 'perf_hooks';
import { MemoryTier } from '@prompted-forge/memory';
import { MemoryOperation } from '../interfaces/mcp-interfaces';
import {
  IMemoryOrchestrator,
  RoutingContext,
  RoutingDecision,
  ScoringResult,
  OrchestratorConfig,
  OrchestratorHealth,
  OrchestratorMetrics,
  FallbackStrategy,
  SemaphoreRelease,
  IdempotencyKey,
  IdempotencyResult,
  // ScoringFunction, // Not needed in this implementation
} from './orchestrator-interfaces';
import { MemoryOrchestratorStub } from './memory-orchestrator-stub';
import { ContextEngine } from '../context/engine';
import { PolicyFramework } from '../policies/framework';
import { ContextInput, ContextAnalysis } from '../types/context';
import { PolicyEvaluationInput, PolicyEvaluationResult } from '../types/policy';

/**
 * Enhanced orchestrator that augments base functionality with context and policy analysis
 */
export class EnhancedMemoryOrchestrator implements IMemoryOrchestrator {
  private baseOrchestrator: MemoryOrchestratorStub;
  private contextEngine: ContextEngine;
  private policyFramework: PolicyFramework;
  private logger: winston.Logger;

  // Enhanced metrics
  private contextAnalysisCount = 0;
  private policyEvaluationCount = 0;
  private totalAnalysisMs = 0;
  private totalPolicyMs = 0;

  constructor(
    config: OrchestratorConfig,
    contextEngine?: ContextEngine,
    policyFramework?: PolicyFramework,
    logger?: winston.Logger
  ) {
    this.baseOrchestrator = new MemoryOrchestratorStub(config, logger);
    this.contextEngine = contextEngine || new ContextEngine();
    this.policyFramework = policyFramework || new PolicyFramework();
    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.label({ label: 'enhanced-orchestrator' }),
        winston.format.json()
      ),
      transports: [new winston.transports.Console()],
    });

    this.logger.info('Enhanced Memory Orchestrator initialized', {
      contextEnabled: this.contextEngine.isEnabled(),
      policiesEnabled: this.policyFramework.isEnabled(),
      version: '3.3.0',
    });
  }

  async initialize(): Promise<void> {
    return this.baseOrchestrator.initialize();
  }

  async shutdown(): Promise<void> {
    return this.baseOrchestrator.shutdown();
  }

  /**
   * Enhanced routing with context analysis and policy evaluation
   */
  async route(context: RoutingContext): Promise<RoutingDecision> {
    const startTime = performance.now();
    let contextAnalysis: ContextAnalysis | null = null;
    let policyResult: PolicyEvaluationResult | null = null;

    try {
      // Step 1: Analyze context (if enabled)
      if (this.contextEngine.isEnabled() && context.content) {
        const contextInput: ContextInput = {
          operation: context.operation as any,
          content: context.content || context.query,
          metadata: context.metadata,
          requestId: context.metadata?.requestId || 'unknown',
        };

        contextAnalysis = await this.contextEngine.analyze(contextInput);
        this.contextAnalysisCount++;
        this.totalAnalysisMs += contextAnalysis.analysisMs;

        // Enrich routing context with analysis
        context.context = contextAnalysis as any;
      }

      // Step 2: Evaluate policies (if enabled)
      if (this.policyFramework.isEnabled()) {
        const policyInput: PolicyEvaluationInput = {
          operation: context.operation as any,
          content: context.content || context.query,
          metadata: context.metadata,
          requestId: context.metadata?.requestId || 'unknown',
          tier: context.userHints?.preferredTier,
          userId: context.metadata?.userId,
        };

        policyResult = await this.policyFramework.evaluate(policyInput);
        this.policyEvaluationCount++;
        this.totalPolicyMs += policyResult.evaluationMs;

        // Check if policies block the operation
        if (policyResult.finalAction === 'deny') {
          return this.createDeniedRoutingDecision(context, policyResult);
        }
      }

      // Step 3: Get enhanced scoring with context/policy augmentation
      const scoringResults = await this.scoreTiers(context);

      // Step 4: Apply policy modifications to scoring
      const enhancedResults = this.applyPolicyScoring(scoringResults, policyResult, contextAnalysis);

      // Step 5: Select best tier
      const bestResult = enhancedResults.reduce((best, current) =>
        current.score > best.score ? current : best
      );

      // Step 6: Create enhanced routing decision
      const decision = await this.baseOrchestrator.route(context);
      
      // Enhance decision with context/policy metadata
      return {
        ...decision,
        primaryTier: bestResult.tier,
        confidence: this.calculateEnhancedConfidence(bestResult, contextAnalysis, policyResult),
        routingReason: this.buildEnhancedReason(bestResult, contextAnalysis, policyResult),
        features: bestResult.features,
        metadata: {
          ...decision.metadata,
          version: '3.3.0',
          // Enhanced analysis metadata (as any to avoid interface issues)
          ...({
            contextEnabled: this.contextEngine.isEnabled(),
            policiesEnabled: this.policyFramework.isEnabled(),
            analysisMs: contextAnalysis?.analysisMs || 0,
            policyMs: policyResult?.evaluationMs || 0,
            intent: contextAnalysis?.intent,
            entitiesCount: contextAnalysis?.entities?.length || 0,
            sentiment: contextAnalysis?.sentiment?.polarity,
            policyActions: policyResult?.decisions?.map(d => d.action) || ['allow'],
            appliedRules: policyResult?.appliedRules?.length || 0,
          } as any),
        },
      };

    } catch (error) {
      this.logger.error('Enhanced routing failed, falling back to base orchestrator', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        totalMs: performance.now() - startTime,
      });

      return this.baseOrchestrator.route(context);
    }
  }

  /**
   * Enhanced scoring that incorporates context analysis and policy decisions
   */
  async scoreTiers(context: RoutingContext): Promise<ScoringResult[]> {
    const baseResults = await this.baseOrchestrator.scoreTiers(context);

    if (!this.contextEngine.isEnabled() && !this.policyFramework.isEnabled()) {
      return baseResults;
    }

    // Apply context-based scoring adjustments
    return baseResults.map(result => this.enhanceScoringResult(result, context));
  }

  /**
   * Apply policy-based scoring modifications
   */
  private applyPolicyScoring(
    results: ScoringResult[],
    policyResult: PolicyEvaluationResult | null,
    contextAnalysis: ContextAnalysis | null
  ): ScoringResult[] {
    if (!policyResult) return results;

    return results.map(result => {
      let scoreMultiplier = 1.0;
      const reasoning = [...result.reasoning];

      // Apply policy-based adjustments
      for (const decision of policyResult.decisions) {
        switch (decision.action) {
          case 'compress':
            if (result.tier === MemoryTier.SEMANTIC) {
              scoreMultiplier *= 1.2; // Favor semantic for compression
              reasoning.push(`Policy: ${decision.reason}`);
            }
            break;
          case 'retain':
            // Retention policies might favor certain tiers based on content type
            if (result.tier === MemoryTier.EPISODIC) {
              scoreMultiplier *= 1.1;
              reasoning.push(`Policy: ${decision.reason}`);
            }
            break;
          case 'redact':
            // Safety redaction might prefer working memory for quick access
            if (result.tier === MemoryTier.WORKING) {
              scoreMultiplier *= 1.15;
              reasoning.push(`Policy: ${decision.reason}`);
            }
            break;
        }
      }

      // Apply context-based adjustments
      if (contextAnalysis) {
        // Intent-based scoring
        switch (contextAnalysis.intent) {
          case 'summarize':
            if (result.tier === MemoryTier.SEMANTIC) {
              scoreMultiplier *= 1.3;
              reasoning.push(`Context: Summarization favors semantic memory`);
            }
            break;
          case 'search':
            if (result.tier === MemoryTier.SEMANTIC && contextAnalysis.entities.length > 0) {
              scoreMultiplier *= 1.25;
              reasoning.push(`Context: Entity-rich search favors semantic memory`);
            }
            break;
          case 'store':
            if (result.tier === MemoryTier.WORKING) {
              scoreMultiplier *= 1.2;
              reasoning.push(`Context: Store intent favors working memory`);
            }
            break;
        }

        // Sentiment-based adjustments
        if (contextAnalysis.sentiment.magnitude > 0.5) {
          if (result.tier === MemoryTier.EPISODIC) {
            scoreMultiplier *= 1.1;
            reasoning.push(`Context: High sentiment magnitude favors episodic memory`);
          }
        }
      }

      return {
        ...result,
        score: Math.min(1.0, result.score * scoreMultiplier),
        reasoning,
        features: [
          ...result.features,
          {
            name: 'policy_multiplier',
            value: scoreMultiplier,
            weight: 0.2,
            contribution: (scoreMultiplier - 1.0) * result.score,
          },
        ],
      };
    });
  }

  /**
   * Enhance individual scoring result with context/policy insights
   */
  private enhanceScoringResult(result: ScoringResult, _context: RoutingContext): ScoringResult {
    // For now, pass through - enhancements applied in applyPolicyScoring
    return result;
  }

  /**
   * Calculate enhanced confidence incorporating context and policy analysis
   */
  private calculateEnhancedConfidence(
    scoringResult: ScoringResult,
    contextAnalysis: ContextAnalysis | null,
    policyResult: PolicyEvaluationResult | null
  ): number {
    let confidence = scoringResult.confidence;

    // Boost confidence if context analysis is high confidence
    if (contextAnalysis && contextAnalysis.confidence > 0.8) {
      confidence = Math.min(1.0, confidence * 1.1);
    }

    // Adjust confidence based on policy certainty
    if (policyResult && policyResult.decisions.length > 0) {
      const avgPolicyConfidence = policyResult.decisions.reduce((sum, d) => sum + d.confidence, 0) / policyResult.decisions.length;
      confidence = Math.min(1.0, confidence * (0.8 + 0.2 * avgPolicyConfidence));
    }

    return confidence;
  }

  /**
   * Build enhanced reasoning that incorporates context and policy insights
   */
  private buildEnhancedReason(
    scoringResult: ScoringResult,
    contextAnalysis: ContextAnalysis | null,
    policyResult: PolicyEvaluationResult | null
  ): string {
    const parts = [scoringResult.reasoning[0] || 'Selected by scoring'];

    if (contextAnalysis) {
      parts.push(`Context: ${contextAnalysis.intent} intent`);
      if (contextAnalysis.entities.length > 0) {
        parts.push(`${contextAnalysis.entities.length} entities detected`);
      }
    }

    if (policyResult && policyResult.decisions.length > 0) {
      const actions = policyResult.decisions.map(d => d.action).join(', ');
      parts.push(`Policies: ${actions}`);
    }

    return parts.join('; ');
  }

  /**
   * Create routing decision for denied operations
   */
  private createDeniedRoutingDecision(
    context: RoutingContext,
    policyResult: PolicyEvaluationResult
  ): RoutingDecision {
    const denyDecision = policyResult.decisions.find(d => d.action === 'deny');
    
    return {
      primaryTier: MemoryTier.WORKING, // Fallback tier
      fallbackStrategy: FallbackStrategy.NONE,
      routingReason: `Operation denied by policy: ${denyDecision?.reason || 'Policy violation'}`,
      confidence: 1.0,
      estimatedLatency: 0,
      features: [],
      metadata: {
        algorithm: 'policy-denial',
        version: '3.3.0',
        timestamp: new Date(),
        requestId: context.metadata?.requestId,
        traceId: context.metadata?.traceId,
        // Extended metadata (as any to avoid interface issues)
        ...({
          denied: true,
          policyReason: denyDecision?.reason,
        } as any),
      },
    };
  }

  // Delegate remaining methods to base orchestrator
  async acquireResources(tier: MemoryTier, operation: MemoryOperation): Promise<SemaphoreRelease> {
    return this.baseOrchestrator.acquireResources(tier, operation);
  }

  releaseResources(release: SemaphoreRelease): void {
    return this.baseOrchestrator.releaseResources(release);
  }

  async checkIdempotency(key: IdempotencyKey): Promise<IdempotencyResult> {
    return this.baseOrchestrator.checkIdempotency(key);
  }

  async storeIdempotencyResult(key: IdempotencyKey, result: any): Promise<void> {
    return this.baseOrchestrator.storeIdempotencyResult(key, result);
  }

  /**
   * Enhanced health check including context and policy framework status
   */
  async getHealth(): Promise<OrchestratorHealth> {
    const baseHealth = await this.baseOrchestrator.getHealth();
    
    return {
      ...baseHealth,
      scoring: {
        ...baseHealth.scoring,
        functionsEnabled: 2, // Base + Enhanced scoring
        averageLatency: this.contextAnalysisCount > 0 
          ? this.totalAnalysisMs / this.contextAnalysisCount 
          : baseHealth.scoring.averageLatency,
      },
    };
  }

  /**
   * Enhanced metrics including context and policy analysis stats
   */
  async getMetrics(): Promise<OrchestratorMetrics> {
    const baseMetrics = await this.baseOrchestrator.getMetrics();
    
    return {
      ...baseMetrics,
      scoring: {
        ...baseMetrics.scoring,
        functionLatencies: {
          ...baseMetrics.scoring.functionLatencies,
          'ContextEngine': this.contextAnalysisCount > 0 ? this.totalAnalysisMs / this.contextAnalysisCount : 0,
          'PolicyFramework': this.policyEvaluationCount > 0 ? this.totalPolicyMs / this.policyEvaluationCount : 0,
        },
      },
    };
  }
}
