import { z } from 'zod';

// Memory Tier Enums
export enum MemoryTier {
  WORKING = 'working',
  EPISODIC = 'episodic', 
  SEMANTIC = 'semantic',
  SHARED = 'shared'
}

export enum RetentionPolicy {
  SESSION_BASED = 'session-based',
  TIME_BASED = 'time-based',
  SIZE_BASED = 'size-based',
  BUSINESS_RULE = 'business-rule'
}

export enum CompressionStrategy {
  NONE = 'none',
  SLIDING_WINDOW = 'sliding-window',
  REFLEXION_SUMMARIZATION = 'reflexion-summarization',
  CONFIDENCE_PRUNING = 'confidence-based-pruning',
  REFERENCE_STORAGE = 'reference-based-storage'
}

// Core Memory Schemas
export const MemoryEntrySchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  agentId: z.string().optional(),
  content: z.any(),
  metadata: z.record(z.any()).default({}),
  timestamp: z.date().default(() => new Date()),
  expiresAt: z.date().optional(),
});

export const MemoryContextSchema = z.object({
  sessionId: z.string(),
  agentId: z.string().optional(),
  businessDomain: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  constraints: z.record(z.any()).optional(),
});

export const MemoryOperationSchema = z.object({
  type: z.enum(['read', 'write', 'update', 'delete', 'compress', 'consolidate']),
  tier: z.nativeEnum(MemoryTier),
  context: MemoryContextSchema,
  data: z.any().optional(),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type MemoryContext = z.infer<typeof MemoryContextSchema>;
export type MemoryOperation = z.infer<typeof MemoryOperationSchema>;

// Memory Result
export interface MemoryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    tier: MemoryTier;
    operationType: string;
    latencyMs: number;
    tokenCount?: number;
    compressionRatio?: number;
  };
}

// Base Memory Tier Interface
export interface IMemoryTier {
  tier: MemoryTier;
  
  // Core operations
  read(key: string, context: MemoryContext): Promise<MemoryResult>;
  write(key: string, entry: MemoryEntry, context: MemoryContext): Promise<MemoryResult>;
  update(key: string, updates: Partial<MemoryEntry>, context: MemoryContext): Promise<MemoryResult>;
  delete(key: string, context: MemoryContext): Promise<MemoryResult>;
  
  // Maintenance operations
  compress(strategy: CompressionStrategy): Promise<MemoryResult>;
  applyRetention(policy: RetentionPolicy): Promise<MemoryResult>;
  
  // Query operations
  search(query: string, context: MemoryContext, limit?: number): Promise<MemoryResult<MemoryEntry[]>>;
  list(context: MemoryContext, limit?: number, offset?: number): Promise<MemoryResult<MemoryEntry[]>>;
  
  // Health and stats
  getStats(): Promise<{
    entryCount: number;
    totalSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
    compressionRatio?: number;
  }>;
  
  isHealthy(): Promise<boolean>;
}

// Working Memory - Session-based context with sliding window
export interface IWorkingMemory extends IMemoryTier {
  // Session management
  createSession(sessionId: string, context: MemoryContext): Promise<MemoryResult>;
  endSession(sessionId: string): Promise<MemoryResult>;
  
  // Context window operations
  addToContext(sessionId: string, content: any, metadata?: any): Promise<MemoryResult>;
  getContextWindow(sessionId: string, tokenLimit?: number): Promise<MemoryResult<any[]>>;
  
  // Checkpoint operations
  createCheckpoint(sessionId: string): Promise<MemoryResult<string>>;
  restoreFromCheckpoint(sessionId: string, checkpointId: string): Promise<MemoryResult>;
  
  // Token management
  getTokenCount(sessionId: string): Promise<number>;
  trimToTokenLimit(sessionId: string, maxTokens: number): Promise<MemoryResult>;
}

// Episodic Memory - Run logs and reflections
export interface IEpisodicMemory extends IMemoryTier {
  // Episode management
  createEpisode(episodeData: EpisodeData): Promise<MemoryResult<string>>;
  getEpisode(episodeId: string): Promise<MemoryResult<Episode>>;
  updateEpisode(episodeId: string, updates: Partial<Episode>): Promise<MemoryResult>;
  
  // Reflection operations
  createReflection(episodeId: string, reflection: ReflectionData): Promise<MemoryResult<string>>;
  getReflections(episodeId: string): Promise<MemoryResult<Reflection[]>>;
  
  // Consolidation
  consolidateEpisodes(sessionId: string, olderThan: Date): Promise<MemoryResult>;
  
  // Querying
  queryBySession(sessionId: string, limit?: number): Promise<MemoryResult<Episode[]>>;
  queryByTimeRange(startTime: Date, endTime: Date): Promise<MemoryResult<Episode[]>>;
  queryByTag(tag: string): Promise<MemoryResult<Episode[]>>;
}

// Semantic Memory - Knowledge graph
export interface ISemanticMemory extends IMemoryTier {
  // Node operations
  createNode(nodeData: SemanticNode): Promise<MemoryResult<string>>;
  getNode(nodeId: string): Promise<MemoryResult<SemanticNode>>;
  updateNode(nodeId: string, updates: Partial<SemanticNode>): Promise<MemoryResult>;
  deleteNode(nodeId: string): Promise<MemoryResult>;
  
  // Edge operations  
  createEdge(fromNodeId: string, toNodeId: string, edgeData: SemanticEdge): Promise<MemoryResult<string>>;
  getEdges(nodeId: string, direction?: 'in' | 'out' | 'both'): Promise<MemoryResult<SemanticEdge[]>>;
  
  // Graph operations
  findPath(fromNodeId: string, toNodeId: string, maxHops?: number): Promise<MemoryResult<SemanticNode[]>>;
  getNeighbors(nodeId: string, depth?: number): Promise<MemoryResult<SemanticNode[]>>;
  
  // Inference operations
  runInference(rules: InferenceRule[]): Promise<MemoryResult>;
  validateFacts(confidenceThreshold: number): Promise<MemoryResult>;
  
  // Confidence management
  updateConfidence(nodeId: string, confidence: number, source?: string): Promise<MemoryResult>;
  pruneByConfidence(threshold: number): Promise<MemoryResult>;
}

// Shared Memory - MCP resource integration
export interface ISharedMemory extends IMemoryTier {
  // Resource operations
  publishResource(resourceData: SharedResource, audience: ResourceAudience): Promise<MemoryResult<string>>;
  getResource(resourceId: string, requesterId: string): Promise<MemoryResult<SharedResource>>;
  updateResource(resourceId: string, updates: Partial<SharedResource>): Promise<MemoryResult>;
  deleteResource(resourceId: string): Promise<MemoryResult>;
  
  // Subscription operations
  subscribe(resourcePattern: string, subscriberId: string, interests: SubscriptionInterest[]): Promise<MemoryResult<string>>;
  unsubscribe(subscriptionId: string): Promise<MemoryResult>;
  
  // Access control
  checkAccess(resourceId: string, requesterId: string): Promise<MemoryResult<boolean>>;
  updateAudience(resourceId: string, audience: ResourceAudience): Promise<MemoryResult>;
  
  // Notification
  notifySubscribers(resourceId: string, changeType: string, data?: any): Promise<MemoryResult>;
}

// Supporting Types
export interface EpisodeData {
  sessionId: string;
  agentId?: string;
  startTime: Date;
  endTime?: Date;
  actions: ActionRecord[];
  context: Record<string, any>;
  tags: string[];
  outcome?: string;
}

export interface Episode extends EpisodeData {
  id: string;
  reflections?: Reflection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionRecord {
  type: 'tool_call' | 'user_input' | 'ai_response' | 'system_event';
  timestamp: Date;
  content: any;
  metadata?: Record<string, any>;
}

export interface ReflectionData {
  summary: string;
  insights: string[];
  outcomes: string[];
  nextSteps: string[];
  confidence: number;
  tags: string[];
}

export interface Reflection extends ReflectionData {
  id: string;
  episodeId: string;
  createdAt: Date;
}

export interface SemanticNode {
  id: string;
  type: string;
  properties: Record<string, any>;
  confidence: number;
  sources: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SemanticEdge {
  id: string;
  type: string;
  properties: Record<string, any>;
  confidence: number;
  weight?: number;
  createdAt: Date;
}

export interface InferenceRule {
  id: string;
  name: string;
  condition: string; // Graph query or logic expression
  action: string;    // What to infer/create
  confidence: number;
}

export interface SharedResource {
  id: string;
  uri: string;
  content: any;
  contentType: string;
  audience: ResourceAudience;
  metadata: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface ResourceAudience {
  scope: 'public' | 'tenant' | 'role' | 'user' | 'custom';
  identifiers: string[];
  accessLevel: 'read' | 'write' | 'admin';
  constraints?: Record<string, any>;
}

export interface SubscriptionInterest {
  changeType: 'content-update' | 'metadata-change' | 'access-change' | 'deletion';
  filter?: Record<string, any>;
}

// Memory Policy Configuration
export interface MemoryPolicyConfig {
  tier: MemoryTier;
  retentionPolicy: RetentionPolicy;
  compressionStrategy: CompressionStrategy;
  
  // Tier-specific settings
  maxSize?: number;
  maxAge?: string;
  compressionInterval?: string;
  consolidationInterval?: string;
  
  // Performance settings
  maxConcurrentOperations?: number;
  operationTimeoutMs?: number;
  
  // Triggers
  triggers?: {
    compress?: string;
    persist?: string;
    evict?: string;
    consolidate?: string;
  };
}
