/**
 * MCP Integration Interfaces
 * 
 * Defines the contracts for Model Context Protocol integration with memory system
 * Following Homeskillet Rhythm™: Design interfaces one module ahead
 */

import { MemoryTier, MemoryResult } from '@prompted-forge/memory';

// ===== MCP Protocol Types =====

export interface MCPRequest {
  id: string;
  method: string;
  params?: Record<string, any>;
  traceId?: string;
  requestId?: string;
}

export interface MCPResponse {
  id: string;
  result?: any;
  error?: MCPError;
  traceId?: string;
  requestId?: string;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPNotification {
  method: string;
  params?: Record<string, any>;
}

// ===== Memory-Specific MCP Types =====

export interface MCPMemoryRequest extends MCPRequest {
  params: {
    operation: MemoryOperation;
    context: MCPConversationContext;
    data?: any;
  };
}

export interface MCPMemoryResponse extends MCPResponse {
  result?: {
    success: boolean;
    data?: MemoryResult;
    metadata?: MCPOperationMetadata;
  };
}

export enum MemoryOperation {
  STORE = 'memory.store',
  RETRIEVE = 'memory.retrieve', 
  SEARCH = 'memory.search',
  UPDATE = 'memory.update',
  DELETE = 'memory.delete',
  COMPRESS = 'memory.compress',
  HEALTH_CHECK = 'memory.health_check',
  GET_STATS = 'memory.get_stats'
}

// ===== Context Analysis Types =====

export interface MCPConversationContext {
  conversationId: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  messages: MCPMessage[];
  metadata?: Record<string, any>;
}

export interface MCPMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ContextAnalysisResult {
  relevantMemories: string[];
  suggestedTier: MemoryTier;
  contentType: ContentType;
  importance: ImportanceLevel;
  entities: ExtractedEntity[];
  topics: string[];
  sentiment?: SentimentAnalysis;
}

export enum ContentType {
  FACTUAL = 'factual',
  CONVERSATIONAL = 'conversational',
  PROCEDURAL = 'procedural',
  PERSONAL = 'personal',
  SYSTEM = 'system'
}

export enum ImportanceLevel {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  context?: string;
}

export enum EntityType {
  PERSON = 'person',
  ORGANIZATION = 'organization',
  LOCATION = 'location',
  DATE = 'date',
  CONCEPT = 'concept',
  TASK = 'task'
}

export interface SentimentAnalysis {
  polarity: number; // -1 to 1
  confidence: number; // 0 to 1
}

// ===== Server & Connection Types =====

export interface MCPServerConfig {
  name: string;
  version: string;
  capabilities: MCPCapabilities;
  transport: TransportConfig;
  memory: MemoryServerConfig;
}

export interface MCPCapabilities {
  memory: {
    operations: MemoryOperation[];
    tiers: MemoryTier[];
    contextAnalysis: boolean;
    realTimeUpdates: boolean;
  };
  tools?: string[];
  resources?: string[];
}

export interface TransportConfig {
  type: 'stdio' | 'websocket' | 'http';
  port?: number;
  host?: string;
  path?: string;
}

export interface MemoryServerConfig {
  enableContextAnalysis: boolean;
  enableRealTimeUpdates: boolean;
  maxConversationHistory: number;
  analysisTimeout: number;
  batchSize: number;
}

export interface MCPConnection {
  id: string;
  status: ConnectionStatus;
  capabilities: MCPCapabilities;
  metadata: ConnectionMetadata;
}

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export interface ConnectionMetadata {
  connectedAt: Date;
  lastActivity: Date;
  requestCount: number;
  errorCount: number;
  clientInfo?: ClientInfo;
}

export interface ClientInfo {
  name?: string;
  version?: string;
  platform?: string;
}

// ===== Bridge & Orchestration Types =====

export interface MemoryBridgeConfig {
  contextAnalysisEnabled: boolean;
  intelligentRouting: boolean;
  batchOperations: boolean;
  cacheResults: boolean;
  telemetryEnabled: boolean;
}

export interface MCPOperationMetadata {
  duration: number;
  tier: MemoryTier;
  contextAnalysis?: ContextAnalysisResult | undefined;
  cached: boolean;
  operationId: string;
  timestamp: Date;
}

export interface BatchMemoryOperation {
  operations: MemoryOperation[];
  context: MCPConversationContext;
  priority: OperationPriority;
  timeout?: number;
}

export enum OperationPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4
}

// ===== Core Service Interfaces =====

export interface IMCPServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getConnections(): MCPConnection[];
  handleRequest(request: MCPRequest): Promise<MCPResponse>;
  handleNotification(notification: MCPNotification): Promise<void>;
  broadcast(notification: MCPNotification): Promise<void>;
  getCapabilities(): MCPCapabilities;
}

export interface IMemoryBridge {
  initialize(): Promise<void>;
  handleMemoryOperation(request: MCPMemoryRequest): Promise<MCPMemoryResponse>;
  analyzeContext(context: MCPConversationContext): Promise<ContextAnalysisResult>;
  routeToTier(operation: MemoryOperation, analysis: ContextAnalysisResult): MemoryTier;
  executeBatch(batch: BatchMemoryOperation): Promise<MemoryResult[]>;
  isHealthy(): Promise<boolean>;
}

export interface IContextAnalyzer {
  analyze(context: MCPConversationContext): Promise<ContextAnalysisResult>;
  extractEntities(content: string): Promise<ExtractedEntity[]>;
  classifyContent(content: string): Promise<ContentType>;
  assessImportance(context: MCPConversationContext, analysis: ContextAnalysisResult): ImportanceLevel;
  suggestTier(analysis: ContextAnalysisResult): MemoryTier;
}

export interface IMCPTelemetry {
  recordRequest(request: MCPRequest, response: MCPResponse, duration: number): void;
  recordMemoryOperation(operation: MemoryOperation, tier: MemoryTier, duration: number, success: boolean): void;
  recordContextAnalysis(analysis: ContextAnalysisResult, duration: number): void;
  recordConnection(connection: MCPConnection, event: 'connected' | 'disconnected' | 'error'): void;
  getMetrics(): MCPMetrics;
}

export interface MCPMetrics {
  connections: {
    total: number;
    active: number;
    errors: number;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageLatency: number;
  };
  memory: {
    operations: Record<MemoryOperation, number>;
    tiers: Record<MemoryTier, number>;
    averageLatency: number;
  };
  contextAnalysis: {
    total: number;
    averageLatency: number;
    entityTypes: Record<EntityType, number>;
    contentTypes: Record<ContentType, number>;
  };
}
