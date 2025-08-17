/**
 * MCP Error Taxonomy
 * 
 * Extends the memory system error taxonomy with MCP-specific error codes
 * Error code range: MCP_8001-8999 (MCP-specific errors)
 */

import { ErrorCode as MemoryErrorCode } from '@prompted-forge/memory';

export enum MCPErrorCode {
  // MCP Protocol Errors (8000-8099)
  MCP_PROTOCOL_ERROR = 'MCP_8001',
  MCP_INVALID_REQUEST = 'MCP_8002',
  MCP_INVALID_RESPONSE = 'MCP_8003',
  MCP_METHOD_NOT_FOUND = 'MCP_8004',
  MCP_INVALID_PARAMS = 'MCP_8005',
  MCP_PARSE_ERROR = 'MCP_8006',
  
  // Connection Errors (8100-8199)
  MCP_CONNECTION_FAILED = 'MCP_8101',
  MCP_CONNECTION_TIMEOUT = 'MCP_8102',
  MCP_CONNECTION_CLOSED = 'MCP_8103',
  MCP_TRANSPORT_ERROR = 'MCP_8104',
  MCP_AUTHENTICATION_FAILED = 'MCP_8105',
  MCP_AUTHORIZATION_FAILED = 'MCP_8106',
  
  // Context Analysis Errors (8200-8299)
  MCP_CONTEXT_ANALYSIS_FAILED = 'MCP_8201',
  MCP_CONTEXT_INVALID = 'MCP_8202',
  MCP_CONTEXT_TIMEOUT = 'MCP_8203',
  MCP_ENTITY_EXTRACTION_FAILED = 'MCP_8204',
  MCP_CONTENT_CLASSIFICATION_FAILED = 'MCP_8205',
  MCP_SENTIMENT_ANALYSIS_FAILED = 'MCP_8206',
  
  // Memory Bridge Errors (8300-8399)
  MCP_BRIDGE_INITIALIZATION_FAILED = 'MCP_8301',
  MCP_BRIDGE_OPERATION_FAILED = 'MCP_8302',
  MCP_TIER_ROUTING_FAILED = 'MCP_8303',
  MCP_BATCH_OPERATION_FAILED = 'MCP_8304',
  MCP_MEMORY_OPERATION_INVALID = 'MCP_8305',
  MCP_BRIDGE_HEALTH_CHECK_FAILED = 'MCP_8306',
  
  // Server Management Errors (8400-8499)
  MCP_SERVER_START_FAILED = 'MCP_8401',
  MCP_SERVER_STOP_FAILED = 'MCP_8402',
  MCP_SERVER_NOT_RUNNING = 'MCP_8403',
  MCP_SERVER_ALREADY_RUNNING = 'MCP_8404',
  MCP_CAPABILITIES_MISMATCH = 'MCP_8405',
  MCP_CONFIGURATION_INVALID = 'MCP_8406',
}

// All error codes combined for type safety
export type AllErrorCodes = MemoryErrorCode | MCPErrorCode;

export interface MCPErrorContext {
  operation?: string;
  method?: string;
  connectionId?: string;
  conversationId?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface MCPStructuredErrorData {
  code: MCPErrorCode;
  message: string;
  context?: MCPErrorContext | undefined;
  cause?: Error | undefined;
  retryable?: boolean | undefined;
  severity?: 'low' | 'medium' | 'high' | 'critical' | undefined;
}

export class MCPError extends Error {
  public readonly code: MCPErrorCode;
  public readonly context?: MCPErrorContext | undefined;
  public readonly cause?: Error | undefined;
  public readonly retryable: boolean;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly timestamp: Date;

  constructor(data: MCPStructuredErrorData) {
    super(data.message);
    this.name = 'MCPError';
    this.code = data.code;
    this.context = data.context;
    this.cause = data.cause;
    this.retryable = data.retryable ?? false;
    this.severity = data.severity ?? 'medium';
    this.timestamp = new Date();

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPError);
    }
  }

  toMCPError(): { code: number; message: string; data?: any } {
    return {
      code: this.getMCPErrorNumber(this.code),
      message: this.message,
      data: {
        errorCode: this.code,
        context: this.context,
        severity: this.severity,
        retryable: this.retryable,
        timestamp: this.timestamp.toISOString()
      }
    };
  }

  private getMCPErrorNumber(code: MCPErrorCode): number {
    // Map our error codes to JSON-RPC 2.0 error codes
    const errorMapping: Record<string, number> = {
      // Protocol errors (-32xxx range)
      [MCPErrorCode.MCP_PARSE_ERROR]: -32700,
      [MCPErrorCode.MCP_INVALID_REQUEST]: -32600,
      [MCPErrorCode.MCP_METHOD_NOT_FOUND]: -32601,
      [MCPErrorCode.MCP_INVALID_PARAMS]: -32602,
      [MCPErrorCode.MCP_PROTOCOL_ERROR]: -32603,
      
      // Application errors (-1 to -32000 range)
      [MCPErrorCode.MCP_CONNECTION_FAILED]: -1001,
      [MCPErrorCode.MCP_CONNECTION_TIMEOUT]: -1002,
      [MCPErrorCode.MCP_CONNECTION_CLOSED]: -1003,
      [MCPErrorCode.MCP_TRANSPORT_ERROR]: -1004,
      [MCPErrorCode.MCP_AUTHENTICATION_FAILED]: -1005,
      [MCPErrorCode.MCP_AUTHORIZATION_FAILED]: -1006,
      
      [MCPErrorCode.MCP_CONTEXT_ANALYSIS_FAILED]: -2001,
      [MCPErrorCode.MCP_CONTEXT_INVALID]: -2002,
      [MCPErrorCode.MCP_CONTEXT_TIMEOUT]: -2003,
      [MCPErrorCode.MCP_ENTITY_EXTRACTION_FAILED]: -2004,
      [MCPErrorCode.MCP_CONTENT_CLASSIFICATION_FAILED]: -2005,
      [MCPErrorCode.MCP_SENTIMENT_ANALYSIS_FAILED]: -2006,
      
      [MCPErrorCode.MCP_BRIDGE_INITIALIZATION_FAILED]: -3001,
      [MCPErrorCode.MCP_BRIDGE_OPERATION_FAILED]: -3002,
      [MCPErrorCode.MCP_TIER_ROUTING_FAILED]: -3003,
      [MCPErrorCode.MCP_BATCH_OPERATION_FAILED]: -3004,
      [MCPErrorCode.MCP_MEMORY_OPERATION_INVALID]: -3005,
      [MCPErrorCode.MCP_BRIDGE_HEALTH_CHECK_FAILED]: -3006,
      
      [MCPErrorCode.MCP_SERVER_START_FAILED]: -4001,
      [MCPErrorCode.MCP_SERVER_STOP_FAILED]: -4002,
      [MCPErrorCode.MCP_SERVER_NOT_RUNNING]: -4003,
      [MCPErrorCode.MCP_SERVER_ALREADY_RUNNING]: -4004,
      [MCPErrorCode.MCP_CAPABILITIES_MISMATCH]: -4005,
      [MCPErrorCode.MCP_CONFIGURATION_INVALID]: -4006,
    };
    
    return errorMapping[code] || -32000; // Default to internal error
  }
}

// Factory functions for common MCP errors
export class MCPErrorFactory {
  static protocolError(message: string, context?: MCPErrorContext): MCPError {
    return new MCPError({
      code: MCPErrorCode.MCP_PROTOCOL_ERROR,
      message,
      context,
      severity: 'high',
    });
  }

  static connectionFailed(reason: string, context?: MCPErrorContext): MCPError {
    return new MCPError({
      code: MCPErrorCode.MCP_CONNECTION_FAILED,
      message: `Connection failed: ${reason}`,
      context,
      retryable: true,
      severity: 'high',
    });
  }

  static methodNotFound(method: string, context?: MCPErrorContext): MCPError {
    return new MCPError({
      code: MCPErrorCode.MCP_METHOD_NOT_FOUND,
      message: `Method not found: ${method}`,
      context: { ...context, method },
      severity: 'medium',
    });
  }

  static invalidParams(method: string, reason: string, context?: MCPErrorContext): MCPError {
    return new MCPError({
      code: MCPErrorCode.MCP_INVALID_PARAMS,
      message: `Invalid parameters for ${method}: ${reason}`,
      context: { ...context, method },
      severity: 'medium',
    });
  }

  static contextAnalysisFailed(reason: string, context?: MCPErrorContext): MCPError {
    return new MCPError({
      code: MCPErrorCode.MCP_CONTEXT_ANALYSIS_FAILED,
      message: `Context analysis failed: ${reason}`,
      context,
      retryable: true,
      severity: 'medium',
    });
  }

  static bridgeOperationFailed(operation: string, reason: string, context?: MCPErrorContext): MCPError {
    return new MCPError({
      code: MCPErrorCode.MCP_BRIDGE_OPERATION_FAILED,
      message: `Bridge operation '${operation}' failed: ${reason}`,
      context: { ...context, operation },
      retryable: true,
      severity: 'high',
    });
  }

  static serverNotRunning(context?: MCPErrorContext): MCPError {
    return new MCPError({
      code: MCPErrorCode.MCP_SERVER_NOT_RUNNING,
      message: 'MCP server is not running',
      context,
      severity: 'high',
    });
  }

  static configurationInvalid(reason: string, context?: MCPErrorContext): MCPError {
    return new MCPError({
      code: MCPErrorCode.MCP_CONFIGURATION_INVALID,
      message: `Configuration invalid: ${reason}`,
      context,
      severity: 'high',
    });
  }
}

// Helper functions
export function isMCPError(error: Error): error is MCPError {
  return error instanceof MCPError;
}

export function toMCPErrorResponse(error: Error, requestId: string): { 
  id: string; 
  error: { code: number; message: string; data?: any } 
} {
  if (error instanceof MCPError) {
    return {
      id: requestId,
      error: error.toMCPError()
    };
  }
  
  // Handle generic errors
  return {
    id: requestId,
    error: {
      code: -32000, // Internal error
      message: error.message,
      data: {
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      }
    }
  };
}
