/**
 * Memory Orchestrator Package Index
 * 
 * Clean exports for orchestrator functionality
 * Following Homeskillet Rhythm™: Well-defined module boundaries
 */

// Core interfaces and types
export * from './orchestrator-interfaces';

// Stub implementation
export { MemoryOrchestratorStub } from './memory-orchestrator-stub';

// Configuration helpers
export {
  createDefaultOrchestratorConfig,
  createDefaultConcurrencyLimits,
  createDevelopmentConfig,
  createProductionConfig,
  createHighThroughputConfig,
  createOrchestratorConfigForEnvironment,
  validateOrchestratorConfig
} from './orchestrator-config';

// Re-export key types for convenience
export type {
  IMemoryOrchestrator,
  RoutingContext,
  RoutingDecision,
  ScoringResult,
  OrchestratorConfig,
  OrchestratorHealth,
  OrchestratorMetrics,
  MemoryTierRouting
} from './orchestrator-interfaces';
