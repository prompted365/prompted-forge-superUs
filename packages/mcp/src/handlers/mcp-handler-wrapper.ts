/**
 * MCP Handler Wrapper with Validation and Error Mapping
 * 
 * Provides standardized validation, error handling, and telemetry
 * for all MCP request handlers following the Homeskillet pattern.
 */

import { validateMethodRequest } from '../validation/schemas';
import { MCPErrorFactory, MCPError } from '../interfaces/mcp-errors';

export interface MCPContext {
  traceId: string;
  requestId: string;
  userId?: string;
  sessionId?: string;
  startTime: number;
}

export interface MCPHandlerResult<T = any> {
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  telemetry?: {
    latency_ms: number;
    operation: string;
    tier?: string;
    score?: number;
    routing_reason?: string;
    queue_ms?: number;
  };
}

type MCPHandler<TRequest, TResponse> = (
  request: TRequest,
  context: MCPContext
) => Promise<MCPHandlerResult<TResponse>>;

/**
 * Wraps an MCP handler with validation, error mapping, and telemetry
 */
export function createMCPHandler<TRequest, TResponse>(
  method: string,
  handler: MCPHandler<TRequest, TResponse>
) {
  return async (rawRequest: unknown): Promise<MCPHandlerResult<TResponse>> => {
    const startTime = Date.now();
    
    // Extract trace context early for telemetry
    const traceId = (rawRequest as any)?.traceId || generateTraceId();
    const requestId = (rawRequest as any)?.requestId || generateRequestId();
    
    const context: MCPContext = {
      traceId,
      requestId,
      userId: (rawRequest as any)?.params?.context?.userId,
      sessionId: (rawRequest as any)?.params?.context?.sessionId,
      startTime,
    };

    try {
      // Runtime validation with Zod
      const validation = validateMethodRequest(method, rawRequest);
      
      if (!validation.success) {
        throw MCPErrorFactory.invalidParams(
          method,
          validation.error.message,
          { 
            operation: method,
            metadata: {
              traceId,
              requestId,
              validation_issues: validation.error.issues 
            }
          }
        );
      }

      // Call the actual handler with validated request
      const result = await handler(validation.data, context);
      
      // Add telemetry if not already present
      if (!result.telemetry) {
        result.telemetry = {
          latency_ms: Date.now() - startTime,
          operation: method,
        };
      }

      return result;

    } catch (error) {
      const latency_ms = Date.now() - startTime;
      
      // Map errors to standardized MCP error format
      if (error instanceof MCPError) {
        const mcpError = error.toMCPError();
        return {
          error: {
            code: mcpError.code,
            message: mcpError.message,
            data: { ...mcpError.data, traceId, requestId }
          },
          telemetry: {
            latency_ms,
            operation: method,
          }
        };
      }

      // Handle unexpected errors
      console.error(`MCP Handler Error [${method}]`, {
        traceId,
        requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        error: {
          code: 5000, // Internal server error range
          message: 'Internal server error',
          data: { traceId, requestId, operation: method }
        },
        telemetry: {
          latency_ms,
          operation: method,
        }
      };
    }
  };
}

/**
 * Example usage patterns for different MCP operations
 */

// Store operation handler
export const handleStore = createMCPHandler(
  'memory.store',
  async (_request: any, context: MCPContext) => {
    // TODO: Replace with actual orchestrator call
    const mockResult = {
      id: generateRequestId(),
      tier: 'working',
      stored_at: new Date().toISOString(),
    };

    return {
      result: mockResult,
      telemetry: {
        latency_ms: Date.now() - context.startTime,
        operation: 'store',
        tier: 'working',
        routing_reason: 'Store operations favor working memory',
        score: 0.9,
      }
    };
  }
);

// Search operation handler  
export const handleSearch = createMCPHandler(
  'memory.search',
  async (request: any, context: MCPContext) => {
    const { query } = request.params;

    // TODO: Replace with actual orchestrator call
    const mockResults = [
      {
        id: generateRequestId(),
        content: `Mock search result for: ${query}`,
        tier: 'semantic',
        relevance: 0.85,
        timestamp: new Date().toISOString(),
      }
    ];

    return {
      result: { results: mockResults, total: mockResults.length },
      telemetry: {
        latency_ms: Date.now() - context.startTime,
        operation: 'search',
        tier: 'semantic',
        routing_reason: 'Search operations favor semantic memory',
        score: 0.9,
      }
    };
  }
);

// Retrieve operation handler
export const handleRetrieve = createMCPHandler(
  'memory.retrieve', 
  async (request: any, context: MCPContext) => {
    const { query } = request.params;

    // TODO: Replace with actual orchestrator call
    const mockResult = {
      id: generateRequestId(),
      content: `Retrieved content for: ${query}`,
      tier: 'episodic',
      timestamp: new Date().toISOString(),
      metadata: {},
    };

    return {
      result: mockResult,
      telemetry: {
        latency_ms: Date.now() - context.startTime,
        operation: 'retrieve',
        tier: 'episodic',
        routing_reason: 'Retrieve operations favor episodic memory',
        score: 0.9,
      }
    };
  }
);

/**
 * Utility functions
 */

function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

/**
 * Handler registry for easy method dispatch
 */
export const MCPHandlers = {
  'memory.store': handleStore,
  'memory.search': handleSearch,  
  'memory.retrieve': handleRetrieve,
} as const;

export type MCPMethodName = keyof typeof MCPHandlers;
