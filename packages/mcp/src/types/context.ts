import { z } from 'zod';

/**
 * Intent Classification
 * Coarse-grained classification of what the user wants to do
 */
export const IntentType = z.enum([
  'store',      // Store new memory/information
  'retrieve',   // Get specific information
  'search',     // Search through memories
  'summarize',  // Summarize/analyze existing content
  'admin',      // Administrative operations
]);

export type IntentType = z.infer<typeof IntentType>;

/**
 * Entity Extraction Result
 * Lightweight entity recognition for context
 */
export const EntitySchema = z.object({
  text: z.string(),
  type: z.enum(['person', 'place', 'organization', 'concept', 'date', 'other']),
  confidence: z.number().min(0).max(1),
  start: z.number().optional(), // Character position
  end: z.number().optional(),
});

export type Entity = z.infer<typeof EntitySchema>;

/**
 * Sentiment Analysis
 * Simple polarity and magnitude scoring
 */
export const SentimentSchema = z.object({
  polarity: z.number().min(-1).max(1), // -1 (negative) to +1 (positive)
  magnitude: z.number().min(0).max(1), // 0 (neutral) to 1 (strong emotion)
  confidence: z.number().min(0).max(1),
});

export type Sentiment = z.infer<typeof SentimentSchema>;

/**
 * Context Analysis Result
 * Output of the context engine for a given operation
 */
export const ContextAnalysisSchema = z.object({
  intent: IntentType,
  entities: z.array(EntitySchema),
  sentiment: SentimentSchema,
  confidence: z.number().min(0).max(1), // Overall analysis confidence
  notes: z.string().optional(), // Debug/explanation notes
  analysisMs: z.number().min(0), // Time taken for analysis
  engineVersion: z.string().default('1.0'),
});

export type ContextAnalysis = z.infer<typeof ContextAnalysisSchema>;

/**
 * Context Engine Configuration
 */
export const ContextEngineConfigSchema = z.object({
  enabled: z.boolean().default(false),
  maxEntityCount: z.number().int().min(0).default(10),
  minConfidenceThreshold: z.number().min(0).max(1).default(0.3),
  timeoutMs: z.number().int().min(0).default(100),
});

export type ContextEngineConfig = z.infer<typeof ContextEngineConfigSchema>;

/**
 * Context Input for Analysis
 */
export const ContextInputSchema = z.object({
  operation: z.enum(['store', 'retrieve', 'search', 'health']),
  content: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  requestId: z.string(),
});

export type ContextInput = z.infer<typeof ContextInputSchema>;
