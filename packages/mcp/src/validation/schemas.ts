/**
 * Runtime Validation Schemas
 * 
 * Uses Zod for runtime validation of MCP requests and responses
 * Prevents malformed payloads from causing internal errors
 */

import { z } from 'zod';
import { MemoryOperation } from '../interfaces/mcp-interfaces';

// Base MCP Request Schema
export const MCPRequestSchema = z.object({
  id: z.string(),
  method: z.string(),
  params: z.record(z.any()).optional(),
  traceId: z.string().optional(),
  requestId: z.string().optional(),
});

// Base MCP Response Schema
export const MCPResponseSchema = z.object({
  id: z.string(),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  }).optional(),
  traceId: z.string().optional(),
  requestId: z.string().optional(),
});

// MCP Notification Schema
export const MCPNotificationSchema = z.object({
  method: z.string(),
  params: z.record(z.any()).optional(),
});

// Memory Operation Schemas
export const MemoryOperationSchema = z.nativeEnum(MemoryOperation);

export const MCPMemoryRequestSchema = MCPRequestSchema.extend({
  params: z.object({
    operation: MemoryOperationSchema,
    content: z.string().optional(),
    query: z.string().optional(),
    context: z.object({
      conversationId: z.string().optional(),
      userId: z.string().optional(),
      sessionId: z.string().optional(),
      timestamp: z.union([z.string(), z.date()]).optional(),
      messages: z.array(z.object({
        id: z.string().optional(),
        role: z.enum(['user', 'assistant', 'system', 'tool']),
        content: z.string(),
        timestamp: z.union([z.string(), z.date()]),
        metadata: z.record(z.any()).optional()
      })).optional(),
      metadata: z.record(z.any()).optional()
    }).optional(),
    metadata: z.record(z.any()).optional()
  })
});

// Context Analysis Schema
export const ContextAnalysisSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    content: z.string(),
    timestamp: z.union([z.string(), z.date()]),
    metadata: z.record(z.any()).optional()
  })),
  entities: z.array(z.object({
    text: z.string(),
    type: z.string(),
    confidence: z.number(),
    start: z.number(),
    end: z.number()
  })),
  intent: z.string(),
  sentiment: z.object({
    polarity: z.number(),
    subjectivity: z.number(),
    confidence: z.number(),
    label: z.enum(['positive', 'negative', 'neutral'])
  }),
  topics: z.array(z.string()),
  complexity_score: z.number()
});

// Method-specific validation schemas
export const MethodSchemas = {
  'memory.store': MCPMemoryRequestSchema.extend({
    params: MCPMemoryRequestSchema.shape.params.extend({
      operation: z.literal(MemoryOperation.STORE),
      content: z.string().min(1, 'Content cannot be empty')
    })
  }),
  
  'memory.retrieve': MCPMemoryRequestSchema.extend({
    params: MCPMemoryRequestSchema.shape.params.extend({
      operation: z.literal(MemoryOperation.RETRIEVE),
      query: z.string().min(1, 'Query cannot be empty')
    })
  }),
  
  'memory.search': MCPMemoryRequestSchema.extend({
    params: MCPMemoryRequestSchema.shape.params.extend({
      operation: z.literal(MemoryOperation.SEARCH),
      query: z.string().min(1, 'Search query cannot be empty')
    })
  }),
  
  'memory.health_check': MCPMemoryRequestSchema.extend({
    params: MCPMemoryRequestSchema.shape.params.extend({
      operation: z.literal(MemoryOperation.HEALTH_CHECK)
    })
  }),
  
  'memory.get_stats': MCPMemoryRequestSchema.extend({
    params: MCPMemoryRequestSchema.shape.params.extend({
      operation: z.literal(MemoryOperation.GET_STATS)
    })
  }),
  
  'server.capabilities': MCPRequestSchema.extend({
    params: z.object({}).optional()
  })
};

// Helper function to get schema for method
export function getSchemaForMethod(method: string): z.ZodSchema {
  return MethodSchemas[method as keyof typeof MethodSchemas] || MCPRequestSchema;
}

// Validation result types
export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    code: string;
    message: string;
    issues: any[];
  };
};

// Validation helper functions
export function validateMCPRequest(request: unknown): ValidationResult<z.infer<typeof MCPRequestSchema>> {
  try {
    const result = MCPRequestSchema.safeParse(request);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid MCP request format',
          issues: result.error.issues
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        issues: []
      }
    };
  }
}

export function validateMethodRequest(method: string, request: unknown): ValidationResult<any> {
  try {
    const schema = getSchemaForMethod(method);
    const result = schema.safeParse(request);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR', 
          message: `Invalid request for method ${method}`,
          issues: result.error.issues
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        issues: []
      }
    };
  }
}

// Type guards
export function isMCPRequest(value: unknown): value is z.infer<typeof MCPRequestSchema> {
  return MCPRequestSchema.safeParse(value).success;
}

export function isMCPResponse(value: unknown): value is z.infer<typeof MCPResponseSchema> {
  return MCPResponseSchema.safeParse(value).success;
}

export function isMCPNotification(value: unknown): value is z.infer<typeof MCPNotificationSchema> {
  return MCPNotificationSchema.safeParse(value).success;
}
