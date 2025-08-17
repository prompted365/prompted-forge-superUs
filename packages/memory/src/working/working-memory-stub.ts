import winston from 'winston';
import {
  IWorkingMemory,
  IMemoryTier,
  MemoryTier,
  MemoryEntry,
  MemoryContext,
  MemoryResult,
  CompressionStrategy,
  RetentionPolicy,
  MemoryPolicyConfig
} from '../interfaces';
import { Clock, TokenCounter } from '../utils';

type ContextItem = { content: any; metadata?: any; timestamp: Date };

export class WorkingMemoryStub implements IWorkingMemory {
  tier: MemoryTier = MemoryTier.WORKING;

  private entries = new Map<string, MemoryEntry>();
  private sessionContext = new Map<string, ContextItem[]>();
  private checkpoints = new Map<string, Map<string, ContextItem[]>>();

  constructor(
    private redisConfig: any,
    private postgresConfig: any,
    private policy: MemoryPolicyConfig,
    private logger: winston.Logger
  ) {
    this.logger.info('WorkingMemoryStub initialized');
  }

  // ---------- IMemoryTier core ----------
  async read(key: string, _ctx: MemoryContext): Promise<MemoryResult> {
    const start = Clock.nowMs();
    const data = this.entries.get(key);
    return { success: !!data, data, metadata: { tier: this.tier, operationType: 'read', latencyMs: Date.now() - start } };
  }

  async write(key: string, entry: MemoryEntry, _ctx: MemoryContext): Promise<MemoryResult> {
    const start = Clock.nowMs();
    this.entries.set(key, entry);
    return { success: true, metadata: { tier: this.tier, operationType: 'write', latencyMs: Date.now() - start } };
  }

  async update(key: string, updates: Partial<MemoryEntry>, _ctx: MemoryContext): Promise<MemoryResult> {
    const start = Clock.nowMs();
    const cur = this.entries.get(key);
    if (!cur) return { success: false, error: 'not_found', metadata: { tier: this.tier, operationType: 'update', latencyMs: Date.now() - start } };
    this.entries.set(key, { ...cur, ...updates });
    return { success: true, metadata: { tier: this.tier, operationType: 'update', latencyMs: Date.now() - start } };
  }

  async delete(key: string, _ctx: MemoryContext): Promise<MemoryResult> {
    const start = Clock.nowMs();
    const ok = this.entries.delete(key);
    return { success: ok, metadata: { tier: this.tier, operationType: 'delete', latencyMs: Date.now() - start } };
  }

  async compress(strategy: CompressionStrategy): Promise<MemoryResult> {
    // Minimal sliding-window trim across sessions when over 90% of maxSize
    if (strategy !== CompressionStrategy.SLIDING_WINDOW || !this.policy.maxSize) {
      return { success: true, metadata: { tier: this.tier, operationType: 'compress', latencyMs: 0 } };
    }
    let removed = 0;
    for (const [sessionId, items] of this.sessionContext.entries()) {
      let tokens = TokenCounter.countArray(items.map(i => i.content));
      const limit = Math.floor(this.policy.maxSize * 0.9);
      if (tokens > limit) {
        // drop oldest until within limit
        while (tokens > limit && items.length > 0) {
          const dropped = items.shift();
          removed += 1;
          tokens -= TokenCounter.count(dropped?.content ?? '');
        }
        this.sessionContext.set(sessionId, items);
      }
    }
    return { success: true, data: { removed }, metadata: { tier: this.tier, operationType: 'compress', latencyMs: 0 } };
  }

  async applyRetention(policy: RetentionPolicy): Promise<MemoryResult> {
    if (policy !== RetentionPolicy.SESSION_BASED) return { success: true };
    // nothing to do in stub
    return { success: true, metadata: { tier: this.tier, operationType: 'applyRetention', latencyMs: 0 } };
  }

  async search(query: string, ctx: MemoryContext, limit = 10): Promise<MemoryResult<MemoryEntry[]>> {
    const entries = [...this.entries.values()].filter(e =>
      (!ctx.sessionId || e.sessionId === ctx.sessionId) &&
      JSON.stringify(e.content).toLowerCase().includes(query.toLowerCase())
    );
    return { success: true, data: entries.slice(0, limit), metadata: { tier: this.tier, operationType: 'search', latencyMs: 0 } };
  }

  async list(_ctx: MemoryContext, limit = 50, offset = 0): Promise<MemoryResult<MemoryEntry[]>> {
    const arr = [...this.entries.values()].slice(offset, offset + limit);
    return { success: true, data: arr, metadata: { tier: this.tier, operationType: 'list', latencyMs: 0 } };
  }

  async getStats(): Promise<{ entryCount: number; totalSize: number; oldestEntry?: Date; newestEntry?: Date; compressionRatio?: number; }> {
    const all = [...this.entries.values()];
    const times = all.map(e => e.timestamp?.getTime?.() ?? 0).filter(Boolean).sort((a,b) => a-b);
    return {
      entryCount: all.length,
      totalSize: JSON.stringify(all).length,
      oldestEntry: times.length ? new Date(times[0]) : undefined,
      newestEntry: times.length ? new Date(times[times.length - 1]) : undefined,
      compressionRatio: 0.8
    };
  }

  async isHealthy(): Promise<boolean> { return true; }

  // ---------- IWorkingMemory ----------
  async createSession(sessionId: string, _context: MemoryContext): Promise<MemoryResult> {
    if (!this.sessionContext.has(sessionId)) this.sessionContext.set(sessionId, []);
    return { success: true, metadata: { tier: this.tier, operationType: 'createSession', latencyMs: 0 } };
  }

  async endSession(sessionId: string): Promise<MemoryResult> {
    this.sessionContext.delete(sessionId);
    this.checkpoints.delete(sessionId);
    return { success: true, metadata: { tier: this.tier, operationType: 'endSession', latencyMs: 0 } };
  }

  async addToContext(sessionId: string, content: any, metadata?: any): Promise<MemoryResult> {
    const items = this.sessionContext.get(sessionId) ?? [];
    items.push({ content, metadata, timestamp: new Date() });
    this.sessionContext.set(sessionId, items);
    return { success: true, metadata: { tier: this.tier, operationType: 'addToContext', latencyMs: 0, tokenCount: await this.getTokenCount(sessionId) } };
  }

  async getContextWindow(sessionId: string, tokenLimit = this.policy.maxSize ?? 128000): Promise<MemoryResult<any[]>> {
    const items = this.sessionContext.get(sessionId) ?? [];
    const out: any[] = [];
    let tokens = 0;
    for (let i = items.length - 1; i >= 0; i--) {
      const t = TokenCounter.count(items[i].content);
      if (tokens + t > tokenLimit) break;
      out.unshift(items[i].content);
      tokens += t;
    }
    return { success: true, data: out, metadata: { tier: this.tier, operationType: 'getContextWindow', latencyMs: 0, tokenCount: tokens } };
  }

  async createCheckpoint(sessionId: string): Promise<MemoryResult<string>> {
    const id = `ckpt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const snap = (this.sessionContext.get(sessionId) ?? []).map(x => ({ ...x }));
    const map = this.checkpoints.get(sessionId) ?? new Map<string, ContextItem[]>();
    map.set(id, snap);
    this.checkpoints.set(sessionId, map);
    return { success: true, data: id, metadata: { tier: this.tier, operationType: 'createCheckpoint', latencyMs: 0 } };
  }

  async restoreFromCheckpoint(sessionId: string, checkpointId: string): Promise<MemoryResult> {
    const map = this.checkpoints.get(sessionId);
    if (!map || !map.has(checkpointId)) return { success: false, error: 'checkpoint_not_found' };
    this.sessionContext.set(sessionId, map.get(checkpointId)!.map(x => ({ ...x })));
    return { success: true, metadata: { tier: this.tier, operationType: 'restoreFromCheckpoint', latencyMs: 0 } };
  }

  async getTokenCount(sessionId: string): Promise<number> {
    const items = this.sessionContext.get(sessionId) ?? [];
    return TokenCounter.countArray(items.map(i => i.content));
  }

  async trimToTokenLimit(sessionId: string, maxTokens: number): Promise<MemoryResult> {
    const items = this.sessionContext.get(sessionId) ?? [];
    let tokens = TokenCounter.countArray(items.map(i => i.content));
    let removed = 0;
    while (tokens > maxTokens && items.length) {
      const dropped = items.shift();
      removed++;
      tokens -= TokenCounter.count(dropped?.content ?? '');
    }
    this.sessionContext.set(sessionId, items);
    return { success: true, data: { removed, tokens }, metadata: { tier: this.tier, operationType: 'trimToTokenLimit', latencyMs: 0, tokenCount: tokens } };
  }
}
