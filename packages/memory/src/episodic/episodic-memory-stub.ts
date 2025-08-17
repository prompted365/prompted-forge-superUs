import winston from 'winston';
import { 
  IEpisodicMemory,
  MemoryTier,
  MemoryPolicyConfig,
  MemoryResult,
  EpisodeData,
  Episode,
  ReflectionData,
  Reflection,
  ActionRecord
} from '../interfaces';
import { BaseMemoryStub } from '../base/base-memory-stub';

export class EpisodicMemoryStub extends BaseMemoryStub implements IEpisodicMemory {
  private episodes = new Map<string, Episode>();
  private reflections = new Map<string, Reflection[]>();
  
  constructor(
    private postgresConfig: any,
    policy: MemoryPolicyConfig,
    logger: winston.Logger
  ) {
    super(MemoryTier.EPISODIC, policy, logger, 'Episodic Memory');
  }

  // Episodic-specific methods
  async createEpisode(episodeData: EpisodeData): Promise<MemoryResult<string>> {
    const id = `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const episode: Episode = {
      ...episodeData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.episodes.set(id, episode);
    this.reflections.set(id, []);
    
    return {
      success: true,
      data: id,
      metadata: {
        tier: this.tier,
        operationType: 'createEpisode',
        latencyMs: 15,
      }
    };
  }

  async getEpisode(episodeId: string): Promise<MemoryResult<Episode>> {
    const episode = this.episodes.get(episodeId);
    
    return {
      success: !!episode,
      data: episode,
      error: episode ? undefined : 'Episode not found',
      metadata: {
        tier: this.tier,
        operationType: 'getEpisode',
        latencyMs: 10,
      }
    };
  }

  async updateEpisode(episodeId: string, updates: Partial<Episode>): Promise<MemoryResult> {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      return {
        success: false,
        error: 'Episode not found',
        metadata: { tier: this.tier, operationType: 'updateEpisode', latencyMs: 5 }
      };
    }
    
    const updated = { ...episode, ...updates, updatedAt: new Date() };
    this.episodes.set(episodeId, updated);
    
    return {
      success: true,
      data: updated,
      metadata: { tier: this.tier, operationType: 'updateEpisode', latencyMs: 10 }
    };
  }

  async createReflection(episodeId: string, reflection: ReflectionData): Promise<MemoryResult<string>> {
    if (!this.episodes.has(episodeId)) {
      return {
        success: false,
        error: 'Episode not found',
        metadata: { tier: this.tier, operationType: 'createReflection', latencyMs: 5 }
      };
    }
    
    const id = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reflectionObj: Reflection = {
      ...reflection,
      id,
      episodeId,
      createdAt: new Date(),
    };
    
    if (!this.reflections.has(episodeId)) {
      this.reflections.set(episodeId, []);
    }
    this.reflections.get(episodeId)!.push(reflectionObj);
    
    return {
      success: true,
      data: id,
      metadata: { tier: this.tier, operationType: 'createReflection', latencyMs: 12 }
    };
  }

  async getReflections(episodeId: string): Promise<MemoryResult<Reflection[]>> {
    const reflections = this.reflections.get(episodeId) || [];
    
    return {
      success: true,
      data: reflections,
      metadata: { tier: this.tier, operationType: 'getReflections', latencyMs: 8 }
    };
  }

  async consolidateEpisodes(sessionId: string, olderThan: Date): Promise<MemoryResult> {
    const episodes = Array.from(this.episodes.values())
      .filter(ep => ep.sessionId === sessionId && ep.createdAt < olderThan);
    
    // Simple consolidation - create summary episode
    if (episodes.length > 5) {
      const summaryId = `summary_${sessionId}_${Date.now()}`;
      const summaryEpisode: Episode = {
        id: summaryId,
        sessionId,
        startTime: episodes[0].startTime,
        endTime: episodes[episodes.length - 1].endTime || new Date(),
        actions: [{
          type: 'system_event',
          timestamp: new Date(),
          content: `Consolidated ${episodes.length} episodes`,
        }],
        context: { consolidated: true, originalEpisodes: episodes.length },
        tags: ['consolidated'],
        outcome: `Summary of ${episodes.length} episodes`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Remove original episodes and add summary
      episodes.forEach(ep => {
        this.episodes.delete(ep.id);
        this.reflections.delete(ep.id);
      });
      this.episodes.set(summaryId, summaryEpisode);
    }
    
    return {
      success: true,
      data: { consolidated: episodes.length },
      metadata: { tier: this.tier, operationType: 'consolidateEpisodes', latencyMs: 100 }
    };
  }

  async queryBySession(sessionId: string, limit = 50): Promise<MemoryResult<Episode[]>> {
    const episodes = Array.from(this.episodes.values())
      .filter(ep => ep.sessionId === sessionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    
    return {
      success: true,
      data: episodes,
      metadata: { tier: this.tier, operationType: 'queryBySession', latencyMs: 25 }
    };
  }

  async queryByTimeRange(startTime: Date, endTime: Date): Promise<MemoryResult<Episode[]>> {
    const episodes = Array.from(this.episodes.values())
      .filter(ep => ep.startTime >= startTime && ep.startTime <= endTime)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    
    return {
      success: true,
      data: episodes,
      metadata: { tier: this.tier, operationType: 'queryByTimeRange', latencyMs: 30 }
    };
  }

  async queryByTag(tag: string): Promise<MemoryResult<Episode[]>> {
    const episodes = Array.from(this.episodes.values())
      .filter(ep => ep.tags.includes(tag))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return {
      success: true,
      data: episodes,
      metadata: { tier: this.tier, operationType: 'queryByTag', latencyMs: 20 }
    };
  }
}
