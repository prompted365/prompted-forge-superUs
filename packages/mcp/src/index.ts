/**
 * MCP Package Main Export
 * 
 * Following Homeskillet Rhythm™: Clean interface boundaries and modular exports
 */

// Core interfaces
export * from './interfaces/mcp-interfaces';
export {
  MCPErrorCode,
  MCPError,
  MCPErrorFactory,
  isMCPError,
  toMCPErrorResponse
} from './interfaces/mcp-errors';
export type {
  MCPErrorContext,
  MCPStructuredErrorData,
  AllErrorCodes
} from './interfaces/mcp-errors';

// Validation schemas and helpers
export {
  MCPRequestSchema,
  MCPResponseSchema,
  MCPNotificationSchema,
  validateMCPRequest,
  validateMethodRequest,
  isMCPRequest,
  isMCPResponse,
  isMCPNotification
} from './validation/schemas';
export type { ValidationResult } from './validation/schemas';

// Stub implementations
export { MCPServerStub } from './server/mcp-server-stub';
export { MemoryBridgeStub } from './bridge/memory-bridge-stub';

// Memory Orchestrator - Temporarily disabled for deployment pipeline
// TODO: Re-enable orchestrator exports after deployment pipeline is working
// export * from './orchestrator';

// Context Analysis (Phase 3.3)
export type {
  ContextAnalysis as ContextAnalysisV33,
  ContextInput,
  ContextEngineConfig,
  IntentType,
  Entity,
  Sentiment
} from './types/context';
export {
  IntentType as IntentTypeEnum,
  EntitySchema,
  SentimentSchema,
  ContextAnalysisSchema,
  ContextEngineConfigSchema,
  ContextInputSchema
} from './types/context';
export { ContextEngine } from './context/engine';

// Policy Framework (Phase 3.3)
export type {
  PolicyEvaluationResult,
  PolicyEvaluationInput,
  PolicyFrameworkConfig,
  PolicyDecision,
  PolicyActionType,
  RetentionPolicy,
  CompressionPolicy,
  SafetyPolicy,
  AccessControlPolicy
} from './types/policy';
export {
  PolicyActionType as PolicyActionTypeEnum,
  PolicyDecisionSchema,
  RetentionPolicySchema,
  CompressionPolicySchema,
  SafetyPolicySchema,
  AccessControlPolicySchema,
  PolicyFrameworkConfigSchema,
  PolicyEvaluationResultSchema,
  PolicyEvaluationInputSchema
} from './types/policy';
export { PolicyFramework } from './policies/framework';

// Default configuration helpers
export function createDefaultMCPServerConfig(overrides: Partial<any> = {}): any {
  return {
    name: 'prompted-forge-mcp-server',
    version: '0.1.0',
    capabilities: {
      memory: {
        operations: [
          'memory.store',
          'memory.retrieve', 
          'memory.search',
          'memory.health_check',
          'memory.get_stats'
        ],
        tiers: ['WORKING', 'EPISODIC', 'SEMANTIC', 'SHARED'],
        contextAnalysis: true,
        realTimeUpdates: false
      }
    },
    transport: {
      type: 'stdio' as const,
      port: 3001
    },
    memory: {
      enableContextAnalysis: true,
      enableRealTimeUpdates: false,
      maxConversationHistory: 50,
      analysisTimeout: 5000,
      batchSize: 10
    },
    ...overrides
  };
}

export function createDefaultMemoryBridgeConfig(overrides: Partial<any> = {}): any {
  return {
    contextAnalysisEnabled: true,
    intelligentRouting: true,
    batchOperations: false,
    cacheResults: false,
    telemetryEnabled: true,
    ...overrides
  };
}

// Database Integration (Phase 3.4) - Temporarily disabled for deployment pipeline
// TODO: Re-enable database exports after deployment pipeline is working

// Package metadata
export const VERSION = '0.3.3';
export const PACKAGE_NAME = '@prompted-forge/mcp';
