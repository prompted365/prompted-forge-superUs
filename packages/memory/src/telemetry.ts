/**
 * Telemetry Instrumentation for Memory System
 * 
 * Emits structured events for observability and monitoring
 */

import winston from 'winston';
import { ErrorCode, MemoryError } from './errors';
import { MemoryTier } from './interfaces';

export enum TelemetryEventType {
  // Lifecycle Events
  MEMORY_TIER_CREATED = 'memory.tier.created',
  MEMORY_TIER_DESTROYED = 'memory.tier.destroyed',
  MEMORY_TIER_HEALTH_CHECK = 'memory.tier.health_check',
  
  // Operation Events
  MEMORY_OPERATION_START = 'memory.operation.start',
  MEMORY_OPERATION_SUCCESS = 'memory.operation.success',
  MEMORY_OPERATION_FAILURE = 'memory.operation.failure',
  MEMORY_OPERATION_TIMEOUT = 'memory.operation.timeout',
  
  // Data Events
  MEMORY_ITEM_CREATED = 'memory.item.created',
  MEMORY_ITEM_UPDATED = 'memory.item.updated',
  MEMORY_ITEM_RETRIEVED = 'memory.item.retrieved',
  MEMORY_ITEM_DELETED = 'memory.item.deleted',
  
  // Policy Events
  MEMORY_COMPRESSION_START = 'memory.compression.start',
  MEMORY_COMPRESSION_SUCCESS = 'memory.compression.success',
  MEMORY_COMPRESSION_FAILURE = 'memory.compression.failure',
  MEMORY_RETENTION_TRIGGERED = 'memory.retention.triggered',
  MEMORY_EVICTION_TRIGGERED = 'memory.eviction.triggered',
  
  // Performance Events
  MEMORY_USAGE_REPORT = 'memory.usage.report',
  MEMORY_LATENCY_REPORT = 'memory.latency.report',
  MEMORY_THROUGHPUT_REPORT = 'memory.throughput.report',
  
  // Error Events
  MEMORY_ERROR_OCCURRED = 'memory.error.occurred',
  MEMORY_ERROR_RECOVERED = 'memory.error.recovered',
}

export interface TelemetryContext {
  tier?: MemoryTier;
  operation?: string;
  userId?: string;
  sessionId?: string;
  memoryId?: string;
  requestId?: string;
  traceId?: string;
}

export interface TelemetryMetrics {
  duration?: number;
  itemCount?: number;
  dataSize?: number;
  compressionRatio?: number;
  cacheHitRate?: number;
  errorRate?: number;
  throughputOps?: number;
  memoryUsage?: number;
  latencyP50?: number;
  latencyP95?: number;
  latencyP99?: number;
}

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: Date;
  context: TelemetryContext;
  metrics?: TelemetryMetrics;
  metadata?: Record<string, any>;
  error?: {
    code?: string;
    message?: string;
    severity?: string;
    retryable?: boolean;
  };
}

export interface TelemetryEmitter {
  emit(event: TelemetryEvent): void;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

// Simple console-based telemetry emitter for development
export class ConsoleTelemetryEmitter implements TelemetryEmitter {
  emit(event: TelemetryEvent): void {
    console.log('[TELEMETRY]', {
      type: event.type,
      timestamp: event.timestamp.toISOString(),
      context: event.context,
      metrics: event.metrics,
      error: event.error,
      metadata: event.metadata
    });
  }
}

// Main telemetry class
export class MemoryTelemetry {
  private emitter: TelemetryEmitter;
  private defaultContext: TelemetryContext;

  constructor(emitter?: TelemetryEmitter, defaultContext?: TelemetryContext) {
    this.emitter = emitter || new ConsoleTelemetryEmitter();
    this.defaultContext = defaultContext || {};
  }

  // Lifecycle events
  tierCreated(tier: MemoryTier, context?: TelemetryContext): void {
    this.emit(TelemetryEventType.MEMORY_TIER_CREATED, {
      ...context,
      tier,
    });
  }

  tierDestroyed(tier: MemoryTier, context?: TelemetryContext): void {
    this.emit(TelemetryEventType.MEMORY_TIER_DESTROYED, {
      ...context,
      tier,
    });
  }

  healthCheck(tier: MemoryTier, healthy: boolean, context?: TelemetryContext): void {
    this.emit(TelemetryEventType.MEMORY_TIER_HEALTH_CHECK, {
      ...context,
      tier,
    }, undefined, {
      healthy,
    });
  }

  // Operation events
  operationStart(operation: string, context?: TelemetryContext): void {
    this.emit(TelemetryEventType.MEMORY_OPERATION_START, {
      ...context,
      operation,
    });
  }

  operationSuccess(operation: string, duration: number, context?: TelemetryContext, metrics?: TelemetryMetrics): void {
    this.emit(TelemetryEventType.MEMORY_OPERATION_SUCCESS, {
      ...context,
      operation,
    }, {
      ...metrics,
      duration,
    });
  }

  operationFailure(operation: string, error: Error | MemoryError, duration?: number, context?: TelemetryContext): void {
    const errorData = error instanceof MemoryError ? {
      code: error.code,
      message: error.message,
      severity: error.severity,
      retryable: error.retryable,
    } : {
      message: error.message,
    };

    this.emit(TelemetryEventType.MEMORY_OPERATION_FAILURE, {
      ...context,
      operation,
    }, duration ? { duration } : undefined, undefined, errorData);
  }

  // Error events
  errorOccurred(error: Error | MemoryError, context?: TelemetryContext): void {
    const errorData = error instanceof MemoryError ? {
      code: error.code,
      message: error.message,
      severity: error.severity,
      retryable: error.retryable,
    } : {
      message: error.message,
    };

    this.emit(TelemetryEventType.MEMORY_ERROR_OCCURRED, context, undefined, undefined, errorData);
  }

  private emit(
    type: TelemetryEventType,
    context?: TelemetryContext,
    metrics?: TelemetryMetrics,
    metadata?: Record<string, any>,
    error?: any
  ): void {
    const event: TelemetryEvent = {
      type,
      timestamp: new Date(),
      context: { ...this.defaultContext, ...context },
      metrics,
      metadata,
      error,
    };

    try {
      this.emitter.emit(event);
    } catch (err) {
      // Telemetry should never break the application
      console.error('Telemetry emission failed:', err);
    }
  }

  async flush(): Promise<void> {
    if (this.emitter.flush) {
      await this.emitter.flush();
    }
  }

  async close(): Promise<void> {
    if (this.emitter.close) {
      await this.emitter.close();
    }
  }
}

// Default telemetry instance
let defaultTelemetry: MemoryTelemetry | null = null;

export function getDefaultTelemetry(): MemoryTelemetry {
  if (!defaultTelemetry) {
    defaultTelemetry = new MemoryTelemetry();
  }
  return defaultTelemetry;
}

export function setDefaultTelemetry(telemetry: MemoryTelemetry): void {
  defaultTelemetry = telemetry;
}
