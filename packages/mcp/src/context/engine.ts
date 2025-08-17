import { performance } from 'perf_hooks';
import {
  ContextAnalysis,
  ContextInput,
  ContextEngineConfig,
  ContextAnalysisSchema,
  IntentType,
  Entity,
  Sentiment,
} from '../types/context';
import { logger } from '../telemetry';

/**
 * Context Engine v1
 * Lightweight context analysis with intent classification, entity extraction, and sentiment
 * All features are gated behind PF_CONTEXT_ENABLED environment variable
 */
export class ContextEngine {
  private config: ContextEngineConfig;
  private enabled: boolean;

  constructor(config?: Partial<ContextEngineConfig>) {
    this.enabled = process.env.PF_CONTEXT_ENABLED === 'true';
    this.config = {
      enabled: this.enabled,
      maxEntityCount: config?.maxEntityCount ?? 10,
      minConfidenceThreshold: config?.minConfidenceThreshold ?? 0.3,
      timeoutMs: config?.timeoutMs ?? 100,
    };

    if (this.enabled) {
      logger.info('Context Engine v1 initialized', {
        config: this.config,
        version: '1.0',
      });
    }
  }

  /**
   * Analyze context for a given input
   * Returns basic analysis when enabled, stub when disabled
   */
  async analyze(input: ContextInput): Promise<ContextAnalysis> {
    const startTime = performance.now();

    try {
      if (!this.enabled) {
        return this.createStubAnalysis(input, performance.now() - startTime);
      }

      const [intent, entities, sentiment] = await Promise.all([
        this.classifyIntent(input),
        this.extractEntities(input),
        this.analyzeSentiment(input),
      ]);

      const analysisMs = performance.now() - startTime;
      const confidence = this.calculateOverallConfidence(intent, entities, sentiment);

      const analysis: ContextAnalysis = {
        intent: intent.intent,
        entities: entities.slice(0, this.config.maxEntityCount),
        sentiment,
        confidence,
        analysisMs,
        engineVersion: '1.0',
        notes: this.enabled ? `Analyzed in ${analysisMs.toFixed(2)}ms` : undefined,
      };

      // Validate result
      const validated = ContextAnalysisSchema.parse(analysis);

      logger.debug('Context analysis completed', {
        requestId: input.requestId,
        intent: validated.intent,
        entitiesCount: validated.entities.length,
        confidence: validated.confidence,
        analysisMs: validated.analysisMs,
      });

      return validated;
    } catch (error) {
      logger.error('Context analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        requestId: input.requestId,
        analysisMs: performance.now() - startTime,
      });

      // Return safe fallback
      return this.createStubAnalysis(input, performance.now() - startTime);
    }
  }

  /**
   * Create stub analysis when engine is disabled or on error
   */
  private createStubAnalysis(input: ContextInput, analysisMs: number): ContextAnalysis {
    const intent = this.inferIntentFromOperation(input.operation);
    
    return {
      intent,
      entities: [],
      sentiment: { polarity: 0, magnitude: 0, confidence: 1.0 },
      confidence: 1.0,
      analysisMs,
      engineVersion: '1.0',
      notes: 'Stub analysis - context engine disabled',
    };
  }

  /**
   * Classify intent based on operation and content
   * v1: Simple rule-based classification
   */
  private async classifyIntent(input: ContextInput): Promise<{ intent: IntentType; confidence: number }> {
    // Primary intent from operation
    let intent = this.inferIntentFromOperation(input.operation);
    let confidence = 0.9;

    // Refine based on content patterns (simple keyword matching)
    if (input.content) {
      const content = input.content.toLowerCase();
      
      // Check for summarization keywords
      if (content.includes('summarize') || content.includes('summary') || content.includes('analyze')) {
        intent = 'summarize';
        confidence = 0.8;
      }
      
      // Check for admin keywords
      if (content.includes('health') || content.includes('status') || content.includes('config')) {
        intent = 'admin';
        confidence = 0.85;
      }
    }

    return { intent, confidence };
  }

  /**
   * Extract entities from content
   * v1: Simple pattern-based extraction
   */
  private async extractEntities(input: ContextInput): Promise<Entity[]> {
    if (!input.content) return [];

    const entities: Entity[] = [];
    const content = input.content;

    // Simple regex-based entity extraction
    const patterns = {
      person: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
      date: /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g,
      organization: /\b[A-Z][A-Za-z]*\s+(Inc|Corp|LLC|Ltd|Company)\b/g,
    };

    // Extract person names
    let match;
    while ((match = patterns.person.exec(content)) !== null) {
      entities.push({
        text: match[0],
        type: 'person',
        confidence: 0.6,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // Extract dates
    while ((match = patterns.date.exec(content)) !== null) {
      entities.push({
        text: match[0],
        type: 'date',
        confidence: 0.8,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // Extract organizations
    while ((match = patterns.organization.exec(content)) !== null) {
      entities.push({
        text: match[0],
        type: 'organization',
        confidence: 0.7,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // Filter by confidence threshold and limit count
    return entities
      .filter(entity => entity.confidence >= this.config.minConfidenceThreshold)
      .slice(0, this.config.maxEntityCount);
  }

  /**
   * Analyze sentiment of content
   * v1: Simple lexicon-based approach
   */
  private async analyzeSentiment(input: ContextInput): Promise<Sentiment> {
    if (!input.content) {
      return { polarity: 0, magnitude: 0, confidence: 1.0 };
    }

    const content = input.content.toLowerCase();
    
    // Simple positive/negative word lists
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'angry', 'frustrated'];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      const matches = content.match(new RegExp(`\\b${word}\\b`, 'g'));
      positiveCount += matches ? matches.length : 0;
    });

    negativeWords.forEach(word => {
      const matches = content.match(new RegExp(`\\b${word}\\b`, 'g'));
      negativeCount += matches ? matches.length : 0;
    });

    const totalWords = content.split(/\s+/).length;
    const totalSentimentWords = positiveCount + negativeCount;
    
    // Calculate polarity (-1 to +1)
    let polarity = 0;
    if (totalSentimentWords > 0) {
      polarity = (positiveCount - negativeCount) / totalSentimentWords;
    }

    // Calculate magnitude (0 to 1)
    const magnitude = Math.min(totalSentimentWords / Math.max(totalWords * 0.1, 1), 1);

    // Calculate confidence based on sentiment word density
    const confidence = Math.min(totalSentimentWords / Math.max(totalWords * 0.05, 1), 1);

    return {
      polarity: Math.max(-1, Math.min(1, polarity)),
      magnitude: Math.max(0, Math.min(1, magnitude)),
      confidence: Math.max(0.1, Math.min(1, confidence)),
    };
  }

  /**
   * Calculate overall confidence based on individual component confidences
   */
  private calculateOverallConfidence(
    intent: { confidence: number },
    entities: Entity[],
    sentiment: Sentiment
  ): number {
    const entityConfidence = entities.length > 0 
      ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length 
      : 0.5;

    return (intent.confidence * 0.4) + (entityConfidence * 0.3) + (sentiment.confidence * 0.3);
  }

  /**
   * Map operation to likely intent
   */
  private inferIntentFromOperation(operation: string): IntentType {
    switch (operation) {
      case 'store': return 'store';
      case 'retrieve': return 'retrieve';
      case 'search': return 'search';
      case 'health': return 'admin';
      default: return 'admin';
    }
  }

  /**
   * Check if context engine is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextEngineConfig {
    return { ...this.config };
  }
}
