/**
 * Memory Orchestrator Configuration Helpers
 * 
 * Provides default configurations and factory functions for the orchestrator
 * Following Homeskillet Rhythm™: Sensible defaults, easy customization
 */

import { MemoryTier } from '@prompted-forge/memory';
import { MemoryOperation } from '../interfaces/mcp-interfaces';
import {
  OrchestratorConfig,
  FallbackStrategy,
  ConcurrencyLimits
} from './orchestrator-interfaces';

export function createDefaultOrchestratorConfig(overrides: Partial<OrchestratorConfig> = {}): OrchestratorConfig {
  const defaultConfig: OrchestratorConfig = {
    enabled: true,
    
    routing: {
      algorithm: 'weighted',
      fallbackStrategy: FallbackStrategy.CASCADE,
      confidenceThreshold: 0.6,
      enableFeatureFlags: true
    },
    
    concurrency: createDefaultConcurrencyLimits(),
    
    scoring: {
      functions: [
        {
          name: 'RecencyContentScoringFunction',
          enabled: true,
          weight: 1.0,
          params: {
            contentLengthThreshold: 500,
            recencyWindow: 3600000 // 1 hour in ms
          }
        }
      ],
      cachingEnabled: true,
      cacheExpiryMs: 300000 // 5 minutes
    },
    
    idempotency: {
      enabled: true,
      keyExpiryMs: 3600000, // 1 hour
      maxKeys: 10000
    },
    
    telemetry: {
      enabled: true,
      sampleRate: 0.1, // 10% sampling
      metricsPrefix: 'pf.mcp.orchestrator'
    }
  };

  return mergeConfig(defaultConfig, overrides);
}

export function createDefaultConcurrencyLimits(overrides: Partial<ConcurrencyLimits> = {}): ConcurrencyLimits {
  const defaults: ConcurrencyLimits = {
    maxConcurrentOperations: 50,
    maxPerTier: {
      [MemoryTier.WORKING]: 20,
      [MemoryTier.EPISODIC]: 15,
      [MemoryTier.SEMANTIC]: 10,
      [MemoryTier.SHARED]: 5
    },
    maxPerOperation: {
      [MemoryOperation.STORE]: 15,
      [MemoryOperation.RETRIEVE]: 20,
      [MemoryOperation.SEARCH]: 10,
      [MemoryOperation.UPDATE]: 8,
      [MemoryOperation.DELETE]: 5,
      [MemoryOperation.COMPRESS]: 2,
      [MemoryOperation.HEALTH_CHECK]: 5,
      [MemoryOperation.GET_STATS]: 5
    },
    timeoutMs: 30000, // 30 seconds
    backpressureThreshold: 0.8 // 80% utilization triggers backpressure
  };

  return { ...defaults, ...overrides };
}

export function createDevelopmentConfig(): OrchestratorConfig {
  return createDefaultOrchestratorConfig({
    routing: {
      algorithm: 'simple',
      fallbackStrategy: FallbackStrategy.SINGLE_TIER,
      confidenceThreshold: 0.3,
      enableFeatureFlags: true
    },
    concurrency: createDefaultConcurrencyLimits({
      maxConcurrentOperations: 10,
      maxPerTier: {
        [MemoryTier.WORKING]: 5,
        [MemoryTier.EPISODIC]: 3,
        [MemoryTier.SEMANTIC]: 3,
        [MemoryTier.SHARED]: 2
      },
      timeoutMs: 10000 // 10 seconds for dev
    }),
    telemetry: {
      enabled: true,
      sampleRate: 1.0, // 100% sampling in dev
      metricsPrefix: 'pf.mcp.orchestrator.dev'
    }
  });
}

export function createProductionConfig(): OrchestratorConfig {
  return createDefaultOrchestratorConfig({
    routing: {
      algorithm: 'weighted',
      fallbackStrategy: FallbackStrategy.INTELLIGENT,
      confidenceThreshold: 0.7,
      enableFeatureFlags: false // Conservative in production
    },
    concurrency: createDefaultConcurrencyLimits({
      maxConcurrentOperations: 100,
      maxPerTier: {
        [MemoryTier.WORKING]: 40,
        [MemoryTier.EPISODIC]: 30,
        [MemoryTier.SEMANTIC]: 20,
        [MemoryTier.SHARED]: 10
      },
      backpressureThreshold: 0.7 // More conservative in production
    }),
    scoring: {
      functions: [
        {
          name: 'RecencyContentScoringFunction',
          enabled: true,
          weight: 1.0,
          params: {
            contentLengthThreshold: 1000,
            recencyWindow: 7200000 // 2 hours
          }
        }
      ],
      cachingEnabled: true,
      cacheExpiryMs: 600000 // 10 minutes in production
    },
    telemetry: {
      enabled: true,
      sampleRate: 0.05, // 5% sampling in production
      metricsPrefix: 'pf.mcp.orchestrator.prod'
    }
  });
}

export function createHighThroughputConfig(): OrchestratorConfig {
  return createDefaultOrchestratorConfig({
    routing: {
      algorithm: 'simple', // Fastest routing
      fallbackStrategy: FallbackStrategy.NONE,
      confidenceThreshold: 0.5,
      enableFeatureFlags: false
    },
    concurrency: createDefaultConcurrencyLimits({
      maxConcurrentOperations: 200,
      maxPerTier: {
        [MemoryTier.WORKING]: 80,
        [MemoryTier.EPISODIC]: 60,
        [MemoryTier.SEMANTIC]: 40,
        [MemoryTier.SHARED]: 20
      },
      timeoutMs: 5000, // Shorter timeouts for high throughput
      backpressureThreshold: 0.9
    }),
    scoring: {
      functions: [
        {
          name: 'RecencyContentScoringFunction',
          enabled: true,
          weight: 1.0,
          params: {
            contentLengthThreshold: 200, // Simpler scoring
            recencyWindow: 1800000 // 30 minutes
          }
        }
      ],
      cachingEnabled: true,
      cacheExpiryMs: 60000 // 1 minute cache for speed
    },
    idempotency: {
      enabled: false, // Disable for maximum throughput
      keyExpiryMs: 0,
      maxKeys: 0
    }
  });
}

// Environment-based configuration factory
export function createOrchestratorConfigForEnvironment(env: string = process.env.NODE_ENV || 'development'): OrchestratorConfig {
  switch (env.toLowerCase()) {
    case 'production':
    case 'prod':
      return createProductionConfig();
      
    case 'development':
    case 'dev':
      return createDevelopmentConfig();
      
    case 'test':
      return createDefaultOrchestratorConfig({
        concurrency: createDefaultConcurrencyLimits({
          maxConcurrentOperations: 5,
          timeoutMs: 1000
        }),
        telemetry: {
          enabled: false,
          sampleRate: 0,
          metricsPrefix: 'test'
        }
      });
      
    case 'benchmark':
    case 'perf':
      return createHighThroughputConfig();
      
    default:
      return createDefaultOrchestratorConfig();
  }
}

// Configuration validation
export function validateOrchestratorConfig(config: OrchestratorConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate routing config
  if (config.routing.confidenceThreshold < 0 || config.routing.confidenceThreshold > 1) {
    errors.push('routing.confidenceThreshold must be between 0 and 1');
  }
  
  // Validate concurrency limits
  if (config.concurrency.maxConcurrentOperations <= 0) {
    errors.push('concurrency.maxConcurrentOperations must be positive');
  }
  
  const tierSum = Object.values(config.concurrency.maxPerTier).reduce((sum, val) => sum + val, 0);
  if (tierSum > config.concurrency.maxConcurrentOperations) {
    errors.push('Sum of maxPerTier cannot exceed maxConcurrentOperations');
  }
  
  // Validate timeouts
  if (config.concurrency.timeoutMs <= 0) {
    errors.push('concurrency.timeoutMs must be positive');
  }
  
  // Validate telemetry
  if (config.telemetry.sampleRate < 0 || config.telemetry.sampleRate > 1) {
    errors.push('telemetry.sampleRate must be between 0 and 1');
  }
  
  // Validate scoring functions
  if (config.scoring.functions.length === 0) {
    errors.push('At least one scoring function must be configured');
  }
  
  for (const func of config.scoring.functions) {
    if (func.weight < 0) {
      errors.push(`Scoring function ${func.name} has negative weight`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Helper function to merge configurations
function mergeConfig(base: OrchestratorConfig, overrides: Partial<OrchestratorConfig>): OrchestratorConfig {
  return {
    enabled: overrides.enabled ?? base.enabled,
    routing: {
      ...base.routing,
      ...overrides.routing
    },
    concurrency: {
      ...base.concurrency,
      ...overrides.concurrency,
      maxPerTier: {
        ...base.concurrency.maxPerTier,
        ...overrides.concurrency?.maxPerTier
      },
      maxPerOperation: {
        ...base.concurrency.maxPerOperation,
        ...overrides.concurrency?.maxPerOperation
      }
    },
    scoring: {
      ...base.scoring,
      ...overrides.scoring
    },
    idempotency: {
      ...base.idempotency,
      ...overrides.idempotency
    },
    telemetry: {
      ...base.telemetry,
      ...overrides.telemetry
    }
  };
}
