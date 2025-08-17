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

// Memory Orchestrator
export * from './orchestrator';

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

// Package metadata
export const VERSION = '0.1.0';
export const PACKAGE_NAME = '@prompted-forge/mcp';
