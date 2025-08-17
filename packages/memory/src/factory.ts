import winston from 'winston';
import { 
  IWorkingMemory, 
  IEpisodicMemory, 
  ISemanticMemory, 
  ISharedMemory, 
  MemoryPolicyConfig,
  MemoryTier,
  RetentionPolicy,
  CompressionStrategy
} from './interfaces';
import { createMemoryLogger } from './utils';

// Database connection configuration
export interface DatabaseConfig {
  postgresql: {
    connectionString: string;
    ssl?: boolean;
    maxConnections?: number;
  };
  redis: {
    url: string;
    db?: number;
    keyPrefix?: string;
  };
}

// Memory factory configuration
export interface MemoryFactoryConfig {
  database: DatabaseConfig;
  policies: Record<string, MemoryPolicyConfig>;
  logger?: winston.Logger;
}

// Abstract base factory
export abstract class MemoryTierFactory<T> {
  protected logger: winston.Logger;
  protected config: MemoryFactoryConfig;

  constructor(config: MemoryFactoryConfig, componentName: string) {
    this.config = config;
    this.logger = config.logger || createMemoryLogger(componentName);
  }

  abstract create(): Promise<T>;
  
  protected getPolicy(tierName: string): MemoryPolicyConfig {
    const policy = this.config.policies[tierName];
    if (!policy) {
      throw new Error(`No policy configured for memory tier: ${tierName}`);
    }
    return policy;
  }
}

// Working Memory Factory
export class WorkingMemoryFactory extends MemoryTierFactory<IWorkingMemory> {
  constructor(config: MemoryFactoryConfig) {
    super(config, 'working-memory-factory');
  }

  async create(): Promise<IWorkingMemory> {
    const impl = process.env.PF_MEMORY_IMPL_WORKING ?? process.env.PF_MEMORY_IMPL ?? 'stub';
    const policy = this.getPolicy('working');
    
    if (impl === 'full') {
      // TODO: Import real WorkingMemoryService when available
      this.logger.warn('Full WorkingMemory implementation not yet available, falling back to stub');
    }
    
    const { WorkingMemoryStub } = await import('./working/working-memory-stub');
    return new WorkingMemoryStub(
      this.config.database.redis,
      this.config.database.postgresql,
      policy,
      this.logger
    );
  }
}

// Episodic Memory Factory  
export class EpisodicMemoryFactory extends MemoryTierFactory<IEpisodicMemory> {
  constructor(config: MemoryFactoryConfig) {
    super(config, 'episodic-memory-factory');
  }

  async create(): Promise<IEpisodicMemory> {
    const impl = process.env.PF_MEMORY_IMPL_EPISODIC ?? process.env.PF_MEMORY_IMPL ?? 'stub';
    const policy = this.getPolicy('episodic');
    
    if (impl === 'full') {
      // TODO: Import real EpisodicMemoryService when available
      this.logger.warn('Full EpisodicMemory implementation not yet available, falling back to stub');
    }
    
    const { EpisodicMemoryStub } = await import('./episodic/episodic-memory-stub');
    return new EpisodicMemoryStub(
      this.config.database.postgresql,
      policy,
      this.logger
    );
  }
}

// Semantic Memory Factory
export class SemanticMemoryFactory extends MemoryTierFactory<ISemanticMemory> {
  constructor(config: MemoryFactoryConfig) {
    super(config, 'semantic-memory-factory');
  }

  async create(): Promise<ISemanticMemory> {
    const impl = process.env.PF_MEMORY_IMPL_SEMANTIC ?? process.env.PF_MEMORY_IMPL ?? 'stub';
    const policy = this.getPolicy('semantic');
    
    if (impl === 'full') {
      // TODO: Import real SemanticMemoryService when available
      this.logger.warn('Full SemanticMemory implementation not yet available, falling back to stub');
    }
    
    const { SemanticMemoryStub } = await import('./semantic/semantic-memory-stub');
    return new SemanticMemoryStub(
      this.config.database.postgresql,
      policy,
      this.logger
    );
  }
}

// Shared Memory Factory
export class SharedMemoryFactory extends MemoryTierFactory<ISharedMemory> {
  constructor(config: MemoryFactoryConfig) {
    super(config, 'shared-memory-factory');
  }

  async create(): Promise<ISharedMemory> {
    const impl = process.env.PF_MEMORY_IMPL_SHARED ?? process.env.PF_MEMORY_IMPL ?? 'stub';
    const policy = this.getPolicy('shared');
    
    if (impl === 'full') {
      // TODO: Import real SharedMemoryService when available
      this.logger.warn('Full SharedMemory implementation not yet available, falling back to stub');
    }
    
    const { SharedMemoryStub } = await import('./shared/shared-memory-stub');
    return new SharedMemoryStub(
      this.config.database.postgresql,
      this.config.database.redis,
      policy,
      this.logger
    );
  }
}

// Main memory system factory
export class MemorySystemFactory {
  private config: MemoryFactoryConfig;
  private workingFactory: WorkingMemoryFactory;
  private episodicFactory: EpisodicMemoryFactory;
  private semanticFactory: SemanticMemoryFactory;
  private sharedFactory: SharedMemoryFactory;

  constructor(config: MemoryFactoryConfig) {
    this.config = config;
    this.workingFactory = new WorkingMemoryFactory(config);
    this.episodicFactory = new EpisodicMemoryFactory(config);
    this.semanticFactory = new SemanticMemoryFactory(config);
    this.sharedFactory = new SharedMemoryFactory(config);
  }

  async createWorkingMemory(): Promise<IWorkingMemory> {
    return await this.workingFactory.create();
  }

  async createEpisodicMemory(): Promise<IEpisodicMemory> {
    return await this.episodicFactory.create();
  }

  async createSemanticMemory(): Promise<ISemanticMemory> {
    return await this.semanticFactory.create();
  }

  async createSharedMemory(): Promise<ISharedMemory> {
    return await this.sharedFactory.create();
  }

  async createAll(): Promise<{
    working: IWorkingMemory;
    episodic: IEpisodicMemory;
    semantic: ISemanticMemory;
    shared: ISharedMemory;
  }> {
    const [working, episodic, semantic, shared] = await Promise.all([
      this.createWorkingMemory(),
      this.createEpisodicMemory(),
      this.createSemanticMemory(),
      this.createSharedMemory(),
    ]);

    return { working, episodic, semantic, shared };
  }
}

// Default configuration helper
export function createDefaultMemoryConfig(overrides: Partial<MemoryFactoryConfig> = {}): MemoryFactoryConfig {
  return {
    database: {
      postgresql: {
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/prompted_forge_dev',
        ssl: process.env.NODE_ENV === 'production',
        maxConnections: 20,
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        db: 0,
        keyPrefix: 'pf:memory:',
      },
    },
    policies: {
      working: {
        tier: MemoryTier.WORKING,
        retentionPolicy: RetentionPolicy.SESSION_BASED,
        compressionStrategy: CompressionStrategy.SLIDING_WINDOW,
        maxSize: 128000, // 128K tokens
        compressionInterval: '15m',
        maxConcurrentOperations: 10,
        operationTimeoutMs: 5000,
        triggers: {
          compress: 'context-window-90%-full',
          persist: 'every-50-messages',
          evict: 'session-end',
        },
      },
      episodic: {
        tier: MemoryTier.EPISODIC,
        retentionPolicy: RetentionPolicy.TIME_BASED,
        compressionStrategy: CompressionStrategy.REFLEXION_SUMMARIZATION,
        maxAge: '90d',
        consolidationInterval: '1w',
        maxConcurrentOperations: 5,
        operationTimeoutMs: 10000,
        triggers: {
          consolidate: 'weekly-batch',
          compress: 'nightly',
        },
      },
      semantic: {
        tier: MemoryTier.SEMANTIC,
        retentionPolicy: RetentionPolicy.BUSINESS_RULE,
        compressionStrategy: CompressionStrategy.CONFIDENCE_PRUNING,
        maxSize: 100000, // 100K facts
        consolidationInterval: '1d',
        maxConcurrentOperations: 5,
        operationTimeoutMs: 15000,
        triggers: {
          compress: 'low-confidence-facts',
          consolidate: 'nightly',
        },
      },
      shared: {
        tier: MemoryTier.SHARED,
        retentionPolicy: RetentionPolicy.BUSINESS_RULE,
        compressionStrategy: CompressionStrategy.REFERENCE_STORAGE,
        maxSize: 1000, // 1K resources per team
        maxConcurrentOperations: 10,
        operationTimeoutMs: 5000,
        triggers: {
          consolidate: 'significant-business-artifact',
          evict: 'business-rule-retention',
        },
      },
    },
    ...overrides,
  };
}
