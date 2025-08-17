import winston from 'winston';
import { 
  IMemoryTier,
  MemoryTier,
  MemoryEntry,
  MemoryContext,
  MemoryResult,
  CompressionStrategy,
  RetentionPolicy,
  MemoryPolicyConfig
} from '../interfaces';

export abstract class BaseMemoryStub implements IMemoryTier {
  protected entries = new Map<string, MemoryEntry>();

  constructor(
    public readonly tier: MemoryTier,
    protected policy: MemoryPolicyConfig,
    protected logger: winston.Logger,
    protected componentName: string
  ) {
    this.logger.info(`${componentName} initialized (stub implementation)`);
  }

  async read(key: string, context: MemoryContext): Promise<MemoryResult> {
    const entry = this.entries.get(key);
    
    return {
      success: !!entry,
      data: entry,
      metadata: {
        tier: this.tier,
        operationType: 'read',
        latencyMs: 10,
      }
    };
  }

  async write(key: string, entry: MemoryEntry, context: MemoryContext): Promise<MemoryResult> {
    this.entries.set(key, { ...entry, id: key });
    
    return {
      success: true,
      data: key,
      metadata: {
        tier: this.tier,
        operationType: 'write',
        latencyMs: 15,
      }
    };
  }

  async update(key: string, updates: Partial<MemoryEntry>, context: MemoryContext): Promise<MemoryResult> {
    const entry = this.entries.get(key);
    
    if (!entry) {
      return {
        success: false,
        error: 'Entry not found',
        metadata: { tier: this.tier, operationType: 'update', latencyMs: 5 }
      };
    }
    
    const updated = { ...entry, ...updates };
    this.entries.set(key, updated);
    
    return {
      success: true,
      data: updated,
      metadata: { tier: this.tier, operationType: 'update', latencyMs: 10 }
    };
  }

  async delete(key: string, context: MemoryContext): Promise<MemoryResult> {
    const deleted = this.entries.delete(key);
    
    return {
      success: deleted,
      metadata: { tier: this.tier, operationType: 'delete', latencyMs: 5 }
    };
  }

  async compress(strategy: CompressionStrategy): Promise<MemoryResult> {
    const originalSize = this.entries.size;
    
    // Simple compression - remove 20% oldest entries if over limit
    if (this.policy.maxSize && this.entries.size > this.policy.maxSize * 0.8) {
      const entries = Array.from(this.entries.entries());
      entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
      
      const toRemove = Math.floor(entries.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.entries.delete(entries[i][0]);
      }
    }
    
    const removed = originalSize - this.entries.size;
    
    return {
      success: true,
      data: { removed },
      metadata: { tier: this.tier, operationType: 'compress', latencyMs: 50 }
    };
  }

  async applyRetention(policy: RetentionPolicy): Promise<MemoryResult> {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    let removed = 0;
    
    for (const [key, entry] of this.entries) {
      if (entry.timestamp.getTime() < cutoff) {
        this.entries.delete(key);
        removed++;
      }
    }
    
    return {
      success: true,
      data: { removed },
      metadata: { tier: this.tier, operationType: 'retention', latencyMs: 30 }
    };
  }

  async search(query: string, context: MemoryContext, limit = 10): Promise<MemoryResult<MemoryEntry[]>> {
    const entries = Array.from(this.entries.values())
      .filter(e => JSON.stringify(e.content).toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
      
    return {
      success: true,
      data: entries,
      metadata: { tier: this.tier, operationType: 'search', latencyMs: 20 }
    };
  }

  async list(context: MemoryContext, limit = 50, offset = 0): Promise<MemoryResult<MemoryEntry[]>> {
    const entries = Array.from(this.entries.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
      
    return {
      success: true,
      data: entries,
      metadata: { tier: this.tier, operationType: 'list', latencyMs: 15 }
    };
  }

  async getStats() {
    return {
      entryCount: this.entries.size,
      totalSize: this.entries.size * 1024,
      oldestEntry: new Date(),
      newestEntry: new Date(),
      compressionRatio: 0.8,
    };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}
