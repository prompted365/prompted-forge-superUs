import axios, { AxiosInstance, AxiosResponse } from 'axios';
import winston from 'winston';
import { z } from 'zod';

// Nexus API Types
export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

export const ChatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ChatMessageSchema),
  max_tokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().optional(),
  top_p: z.number().min(0).max(1).optional(),
});

export const ChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    message: ChatMessageSchema,
    finish_reason: z.string().nullable(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }).optional(),
});

export const ModelSchema = z.object({
  id: z.string(),
  object: z.literal('model'),
  created: z.number(),
  owned_by: z.string(),
});

export const ModelsResponseSchema = z.object({
  object: z.literal('list'),
  data: z.array(ModelSchema),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;
export type ChatCompletionResponse = z.infer<typeof ChatCompletionResponseSchema>;
export type Model = z.infer<typeof ModelSchema>;
export type ModelsResponse = z.infer<typeof ModelsResponseSchema>;

// Nexus Client Configuration
export interface NexusClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// Sampling Configuration
export interface SamplingConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

// Business Context for LLM requests
export interface BusinessContext {
  domain: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  budget?: {
    maxCost: number;
    costPerToken: number;
  };
  sla?: {
    maxLatencyMs: number;
    requireStream: boolean;
  };
  compliance?: {
    dataClassification: string;
    auditRequired: boolean;
  };
}

// Generation Result
export interface GenerationResult {
  id: string;
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    latencyMs: number;
    cost?: number;
    finishReason: string;
  };
}

export class NexusClient {
  private client: AxiosInstance;
  private logger: winston.Logger;
  private config: Required<NexusClientConfig>;

  constructor(config: NexusClientConfig = {}, logger?: winston.Logger) {
    this.config = {
      baseUrl: config.baseUrl || process.env.NEXUS_URL || 'http://localhost:8000',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
    };

    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console()],
    });

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request/response interceptors for logging and retries
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug('Nexus request', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => {
        this.logger.error('Nexus request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor with retry logic
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug('Nexus response', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      async (error) => {
        const config = error.config;
        
        if (!config || config.__retryCount >= this.config.retries) {
          this.logger.error('Nexus response error (final)', { error });
          return Promise.reject(error);
        }

        config.__retryCount = (config.__retryCount || 0) + 1;
        
        this.logger.warn('Nexus response error (retrying)', {
          error: error.message,
          attempt: config.__retryCount,
        });

        await this.delay(this.config.retryDelay * config.__retryCount);
        return this.client(config);
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      this.logger.error('Nexus health check failed', { error });
      return false;
    }
  }

  // List available models
  async listModels(): Promise<Model[]> {
    try {
      const response: AxiosResponse<ModelsResponse> = await this.client.get('/llm/v1/models');
      const validated = ModelsResponseSchema.parse(response.data);
      return validated.data;
    } catch (error) {
      this.logger.error('Failed to list models', { error });
      throw new Error('Failed to list models from Nexus');
    }
  }

  // Basic LLM sampling
  async sampleLLM(
    messages: ChatMessage[],
    config: SamplingConfig
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      const request: ChatCompletionRequest = {
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        stream: false, // Non-streaming for basic sampling
      };

      const validated = ChatCompletionRequestSchema.parse(request);
      
      const response: AxiosResponse<ChatCompletionResponse> = await this.client.post(
        '/llm/v1/chat/completions',
        validated
      );

      const result = ChatCompletionResponseSchema.parse(response.data);
      const latencyMs = Date.now() - startTime;

      this.logger.info('LLM sampling completed', {
        model: config.model,
        tokens: result.usage?.total_tokens,
        latencyMs,
      });

      return {
        id: result.id,
        content: result.choices[0]?.message.content || '',
        model: result.model,
        usage: result.usage ? {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
        } : undefined,
        metadata: {
          latencyMs,
          finishReason: result.choices[0]?.finish_reason || 'unknown',
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.logger.error('LLM sampling failed', {
        model: config.model,
        latencyMs,
        error,
      });
      throw error;
    }
  }

  // Business context-aware sampling
  async requestSampling(
    prompt: string,
    context: BusinessContext,
    agentId?: string
  ): Promise<GenerationResult> {
    // Select optimal model based on context
    const model = await this.selectModel(context);
    
    // Configure sampling parameters based on context
    const samplingConfig: SamplingConfig = {
      model,
      temperature: this.getOptimalTemperature(context),
      maxTokens: this.getOptimalMaxTokens(context),
      stream: context.sla?.requireStream || false,
    };

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: this.buildSystemPrompt(context),
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    this.logger.info('Business sampling request', {
      agentId,
      domain: context.domain,
      priority: context.priority,
      model: samplingConfig.model,
    });

    return await this.sampleLLM(messages, samplingConfig);
  }

  // Streaming support - simplified for now
  async streamLLM(
    messages: ChatMessage[],
    config: SamplingConfig,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const request: ChatCompletionRequest = {
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        stream: true,
      };

      const response = await this.client.post('/llm/v1/chat/completions', request, {
        responseType: 'stream',
      });

      let buffer = '';
      
      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (parseError) {
              this.logger.warn('Failed to parse streaming chunk', { line, parseError });
            }
          }
        }
      });

      return new Promise<void>((resolve, reject) => {
        response.data.on('end', resolve);
        response.data.on('error', reject);
      });
    } catch (error) {
      this.logger.error('Streaming LLM failed', { error });
      throw error;
    }
  }

  private async selectModel(context: BusinessContext): Promise<string> {
    const models = await this.listModels();
    
    // Simple model selection logic based on context
    if (context.priority === 'critical' || context.domain === 'healthcare') {
      // Use highest quality model for critical/healthcare
      return models.find(m => m.id.includes('claude-3-5-sonnet'))?.id || 
             models.find(m => m.id.includes('gpt-4o'))?.id ||
             models[0]?.id;
    } else if (context.budget?.maxCost && context.budget.maxCost < 0.01) {
      // Use cost-effective model for budget constraints
      return models.find(m => m.id.includes('gpt-4o-mini'))?.id ||
             models.find(m => m.id.includes('claude-3-haiku'))?.id ||
             models[0]?.id;
    } else {
      // Use balanced model for general cases
      return models.find(m => m.id.includes('gpt-4o'))?.id ||
             models.find(m => m.id.includes('claude-3-5-sonnet'))?.id ||
             models[0]?.id;
    }
  }

  private getOptimalTemperature(context: BusinessContext): number {
    switch (context.priority) {
      case 'critical':
        return 0.1; // More deterministic for critical tasks
      case 'high':
        return 0.3;
      case 'medium':
        return 0.7;
      case 'low':
        return 0.9; // More creative for low priority
      default:
        return 0.7;
    }
  }

  private getOptimalMaxTokens(context: BusinessContext): number {
    if (context.sla?.maxLatencyMs && context.sla.maxLatencyMs < 5000) {
      return 100; // Short responses for low latency
    }
    return 1000; // Default reasonable length
  }

  private buildSystemPrompt(context: BusinessContext): string {
    const prompts = [
      `You are an AI assistant operating in the ${context.domain} domain.`,
      `Priority level: ${context.priority}`,
    ];

    if (context.compliance?.dataClassification) {
      prompts.push(`Data classification: ${context.compliance.dataClassification}`);
      prompts.push('Please handle all information according to data protection requirements.');
    }

    if (context.compliance?.auditRequired) {
      prompts.push('This interaction is being audited. Please ensure all responses are appropriate and professional.');
    }

    return prompts.join('\n');
  }
}
