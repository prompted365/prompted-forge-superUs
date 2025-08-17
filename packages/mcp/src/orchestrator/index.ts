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

// Enhanced implementation with context and policy integration
export { EnhancedMemoryOrchestrator } from './enhanced-orchestrator';

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
