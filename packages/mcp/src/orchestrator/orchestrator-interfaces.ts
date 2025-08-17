/**
 * Memory Orchestrator Interfaces
 * 
 * Defines intelligent coordination across memory tiers
 * Following Homeskillet Rhythm™: Design interfaces one module ahead
 */

import { MemoryTier } from '@prompted-forge/memory';
import { MemoryOperation } from '../interfaces/mcp-interfaces';

// Forward declare ContextAnalysis (will be imported from MCP interfaces when needed)
export interface ContextAnalysis {
  messages: any[];
  entities: any[];
  intent: string;
  sentiment: any;
  topics: string[];
  complexity_score: number;
}

// ===== Core Orchestrator Types =====

export interface MemoryTierRouting {
  tier: MemoryTier;
  reason: string;
  confidence: number;
  fallbackTiers: MemoryTier[];
  score: number;
  metadata?: {
    analysisMs: number;
    features: string[];
    weight: number;
  };
}

export interface RoutingDecision {
  primaryTier: MemoryTier;
  fallbackStrategy: FallbackStrategy;
  routingReason: string;
  confidence: number;
  estimatedLatency: number;
  features: RoutingFeature[];
  metadata: {
    algorithm: string;
    version: string;
    timestamp: Date;
    requestId?: string;
    traceId?: string;
  };
}

export enum FallbackStrategy {
  NONE = 'none',
  SINGLE_TIER = 'single_tier', 
  CASCADE = 'cascade',
  PARALLEL = 'parallel',
  INTELLIGENT = 'intelligent'
}

export interface RoutingFeature {
  name: string;
  value: number;
  weight: number;
  contribution: number;
}

// ===== Scoring and Routing =====

export interface ScoringResult {
  tier: MemoryTier;
  score: number;
  confidence: number;
  features: RoutingFeature[];
  reasoning: string[];
}

export interface RoutingContext {
  operation: MemoryOperation;
  content?: string;
  query?: string;
  context?: ContextAnalysis;
  userHints?: {
    preferredTier?: MemoryTier;
    urgency?: 'low' | 'medium' | 'high';
    consistency?: 'eventual' | 'strong';
  };
  metadata?: {
    sessionId?: string;
    userId?: string;
    conversationId?: string;
    timestamp: Date;
    [key: string]: any;
  };
}

export interface ScoringFunction {
  name: string;
  version: string;
  weight: number;
  enabled: boolean;
  
  score(context: RoutingContext, tier: MemoryTier): Promise<ScoringResult>;
}

// ===== Concurrency and Resource Management =====

export interface ConcurrencyLimits {
  maxConcurrentOperations: number;
  maxPerTier: Record<MemoryTier, number>;
  maxPerOperation: Record<MemoryOperation, number>;
  timeoutMs: number;
  backpressureThreshold: number;
}

export interface ResourceSemaphore {
  tier: MemoryTier;
  available: number;
  total: number;
  waiting: number;
  
  acquire(timeoutMs?: number): Promise<SemaphoreRelease>;
  tryAcquire(): SemaphoreRelease | null;
}

export interface SemaphoreRelease {
  (): void;
}

export interface QueueMetrics {
  queueTime: number;
  waitTime: number;
  processingTime: number;
  totalTime: number;
}

// ===== Idempotency and Caching =====

export interface IdempotencyKey {
  key: string;
  operation: MemoryOperation;
  contentHash?: string;
  contextHash?: string;
  expiresAt: Date;
}

export interface IdempotencyResult<T = any> {
  hit: boolean;
  result?: T;
  key: IdempotencyKey;
  metadata: {
    createdAt: Date;
    accessCount: number;
    lastAccess: Date;
  };
}

// ===== Configuration and Feature Flags =====

export interface OrchestratorConfig {
  enabled: boolean;
  
  routing: {
    algorithm: 'simple' | 'weighted' | 'ml_based';
    fallbackStrategy: FallbackStrategy;
    confidenceThreshold: number;
    enableFeatureFlags: boolean;
  };
  
  concurrency: ConcurrencyLimits;
  
  scoring: {
    functions: ScoringFunctionConfig[];
    cachingEnabled: boolean;
    cacheExpiryMs: number;
  };
  
  idempotency: {
    enabled: boolean;
    keyExpiryMs: number;
    maxKeys: number;
  };
  
  telemetry: {
    enabled: boolean;
    sampleRate: number;
    metricsPrefix: string;
  };
}

export interface ScoringFunctionConfig {
  name: string;
  enabled: boolean;
  weight: number;
  params?: Record<string, any>;
}

export enum FeatureFlag {
  INTELLIGENT_ROUTING = 'intelligent_routing',
  PREDICTIVE_CACHING = 'predictive_caching',
  DYNAMIC_SCORING = 'dynamic_scoring',
  ADAPTIVE_CONCURRENCY = 'adaptive_concurrency',
  ML_ROUTING = 'ml_routing',
  CHAOS_ENGINEERING = 'chaos_engineering'
}

// ===== Core Orchestrator Interface =====

export interface IMemoryOrchestrator {
  // Core routing
  route(context: RoutingContext): Promise<RoutingDecision>;
  
  // Scoring
  scoreTiers(context: RoutingContext): Promise<ScoringResult[]>;
  
  // Resource management
  acquireResources(tier: MemoryTier, operation: MemoryOperation): Promise<SemaphoreRelease>;
  releaseResources(release: SemaphoreRelease): void;
  
  // Idempotency
  checkIdempotency(key: IdempotencyKey): Promise<IdempotencyResult>;
  storeIdempotencyResult(key: IdempotencyKey, result: any): Promise<void>;
  
  // Health and metrics
  getHealth(): Promise<OrchestratorHealth>;
  getMetrics(): Promise<OrchestratorMetrics>;
  
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface OrchestratorHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  concurrency: {
    activeOperations: number;
    queuedOperations: number;
    totalCapacity: number;
  };
  scoring: {
    functionsEnabled: number;
    cacheHitRate: number;
    averageLatency: number;
  };
  idempotency: {
    activeKeys: number;
    hitRate: number;
  };
}

export interface OrchestratorMetrics {
  routing: {
    totalRequests: number;
    routingLatencyP50: number;
    routingLatencyP95: number;
    routingLatencyP99: number;
    tierDistribution: Record<MemoryTier, number>;
    fallbackRate: number;
  };
  
  concurrency: {
    averageQueueTime: number;
    resourceUtilization: Record<MemoryTier, number>;
    backpressureEvents: number;
    timeouts: number;
  };
  
  scoring: {
    functionLatencies: Record<string, number>;
    cacheStats: {
      hits: number;
      misses: number;
      evictions: number;
    };
  };
  
  idempotency: {
    keyOperations: {
      created: number;
      hits: number;
      expired: number;
    };
  };
}
