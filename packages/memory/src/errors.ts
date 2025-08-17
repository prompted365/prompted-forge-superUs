/**
 * Unified Error Taxonomy for Memory System
 * 
 * Provides structured error handling with error codes and context
 */

export enum ErrorCode {
  // Configuration Errors (1000-1999)
  MEMORY_CONFIG_INVALID = 'MEM_1001',
  MEMORY_POLICY_MISSING = 'MEM_1002',
  MEMORY_POLICY_INVALID = 'MEM_1003',
  DATABASE_CONFIG_INVALID = 'MEM_1004',
  
  // Connection Errors (2000-2999)  
  DATABASE_CONNECTION_FAILED = 'MEM_2001',
  REDIS_CONNECTION_FAILED = 'MEM_2002',
  DATABASE_TIMEOUT = 'MEM_2003',
  CONNECTION_POOL_EXHAUSTED = 'MEM_2004',
  
  // Operation Errors (3000-3999)
  MEMORY_OPERATION_FAILED = 'MEM_3001',
  MEMORY_OPERATION_TIMEOUT = 'MEM_3002',
  MEMORY_OPERATION_CANCELLED = 'MEM_3003',
  CONCURRENT_OPERATION_LIMIT = 'MEM_3004',
  INVALID_OPERATION_CONTEXT = 'MEM_3005',
  
  // Data Errors (4000-4999)
  MEMORY_ITEM_NOT_FOUND = 'MEM_4001',
  MEMORY_ITEM_CORRUPTED = 'MEM_4002',
  MEMORY_STORAGE_FULL = 'MEM_4003',
  MEMORY_COMPRESSION_FAILED = 'MEM_4004',
  MEMORY_DESERIALIZATION_FAILED = 'MEM_4005',
  INVALID_MEMORY_CONTENT = 'MEM_4006',
  
  // Policy Errors (5000-5999)
  RETENTION_POLICY_VIOLATION = 'MEM_5001',
  COMPRESSION_POLICY_FAILED = 'MEM_5002',
  TRIGGER_CONDITION_INVALID = 'MEM_5003',
  POLICY_ENFORCEMENT_FAILED = 'MEM_5004',
  
  // System Errors (6000-6999)
  MEMORY_TIER_UNAVAILABLE = 'MEM_6001',
  MEMORY_FACTORY_FAILED = 'MEM_6002',
  FEATURE_FLAG_INVALID = 'MEM_6003',
  HEALTH_CHECK_FAILED = 'MEM_6004',
  TELEMETRY_FAILED = 'MEM_6005',
  
  // Implementation Errors (7000-7999)
  STUB_NOT_IMPLEMENTED = 'MEM_7001',
  FULL_IMPLEMENTATION_UNAVAILABLE = 'MEM_7002',
  INTERFACE_CONTRACT_VIOLATION = 'MEM_7003',
}

export interface ErrorContext {
  operation?: string;
  tier?: string;
  userId?: string;
  sessionId?: string;
  memoryId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface StructuredErrorData {
  code: ErrorCode;
  message: string;
  context?: ErrorContext;
  cause?: Error;
  retryable?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export class MemoryError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: ErrorContext;
  public readonly cause?: Error;
  public readonly retryable: boolean;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly timestamp: Date;

  constructor(data: StructuredErrorData) {
    super(data.message);
    this.name = 'MemoryError';
    this.code = data.code;
    this.context = data.context;
    this.cause = data.cause;
    this.retryable = data.retryable ?? false;
    this.severity = data.severity ?? 'medium';
    this.timestamp = new Date();

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MemoryError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      retryable: this.retryable,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause?.message,
    };
  }

  toString(): string {
    const contextStr = this.context ? ` [${JSON.stringify(this.context)}]` : '';
    return `${this.name} [${this.code}]: ${this.message}${contextStr}`;
  }
}

// Error factory functions for common error types
export class MemoryErrorFactory {
  static configurationError(message: string, context?: ErrorContext): MemoryError {
    return new MemoryError({
      code: ErrorCode.MEMORY_CONFIG_INVALID,
      message,
      context,
      severity: 'high',
    });
  }

  static connectionError(message: string, cause?: Error, context?: ErrorContext): MemoryError {
    return new MemoryError({
      code: ErrorCode.DATABASE_CONNECTION_FAILED,
      message,
      cause,
      context,
      retryable: true,
      severity: 'high',
    });
  }

  static operationTimeout(operation: string, timeoutMs: number, context?: ErrorContext): MemoryError {
    return new MemoryError({
      code: ErrorCode.MEMORY_OPERATION_TIMEOUT,
      message: `Operation '${operation}' timed out after ${timeoutMs}ms`,
      context: { ...context, operation },
      retryable: true,
      severity: 'medium',
    });
  }

  static itemNotFound(memoryId: string, tier: string, context?: ErrorContext): MemoryError {
    return new MemoryError({
      code: ErrorCode.MEMORY_ITEM_NOT_FOUND,
      message: `Memory item not found: ${memoryId}`,
      context: { ...context, memoryId, tier },
      severity: 'low',
    });
  }

  static policyViolation(policyType: string, details: string, context?: ErrorContext): MemoryError {
    return new MemoryError({
      code: ErrorCode.RETENTION_POLICY_VIOLATION,
      message: `Policy violation (${policyType}): ${details}`,
      context,
      severity: 'medium',
    });
  }

  static tierUnavailable(tier: string, reason: string, context?: ErrorContext): MemoryError {
    return new MemoryError({
      code: ErrorCode.MEMORY_TIER_UNAVAILABLE,
      message: `Memory tier '${tier}' is unavailable: ${reason}`,
      context: { ...context, tier },
      retryable: true,
      severity: 'high',
    });
  }

  static stubNotImplemented(operation: string, tier: string, context?: ErrorContext): MemoryError {
    return new MemoryError({
      code: ErrorCode.STUB_NOT_IMPLEMENTED,
      message: `Operation '${operation}' not implemented in ${tier} stub`,
      context: { ...context, operation, tier },
      severity: 'low',
    });
  }

  static compressionFailed(reason: string, context?: ErrorContext): MemoryError {
    return new MemoryError({
      code: ErrorCode.MEMORY_COMPRESSION_FAILED,
      message: `Memory compression failed: ${reason}`,
      context,
      retryable: true,
      severity: 'medium',
    });
  }
}

// Error classification helpers
export function isRetryableError(error: Error): boolean {
  return error instanceof MemoryError && error.retryable;
}

export function getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
  if (error instanceof MemoryError) {
    return error.severity;
  }
  return 'medium'; // Default for unknown errors
}

export function getErrorCode(error: Error): string | undefined {
  if (error instanceof MemoryError) {
    return error.code;
  }
  return undefined;
}

// Error aggregation for batch operations
export class MemoryErrorBatch {
  private errors: MemoryError[] = [];

  add(error: MemoryError): void {
    this.errors.push(error);
  }

  isEmpty(): boolean {
    return this.errors.length === 0;
  }

  count(): number {
    return this.errors.length;
  }

  getErrors(): MemoryError[] {
    return [...this.errors];
  }

  getBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): MemoryError[] {
    return this.errors.filter(err => err.severity === severity);
  }

  getHighestSeverity(): 'low' | 'medium' | 'high' | 'critical' | null {
    if (this.errors.length === 0) return null;
    
    const severityOrder: Record<string, number> = {
      low: 1, medium: 2, high: 3, critical: 4
    };
    
    return this.errors.reduce((highest: 'low' | 'medium' | 'high' | 'critical', err) => 
      severityOrder[err.severity] > severityOrder[highest] ? err.severity : highest, 
      'low' as const
    );
  }

  toSummaryError(): MemoryError {
    const count = this.count();
    const severity = this.getHighestSeverity() || 'medium';
    
    return new MemoryError({
      code: ErrorCode.MEMORY_OPERATION_FAILED,
      message: `Batch operation failed with ${count} error(s)`,
      severity,
      context: {
        operation: 'batch',
        metadata: {
          errorCount: count,
          errorCodes: this.errors.map(e => e.code),
        },
      },
    });
  }
}
