// Runtime Package Main Export
import winston from 'winston';

// Core Nexus client
export { NexusClient } from './nexus-client';
export type {
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  Model,
  ModelsResponse,
  SamplingConfig,
  BusinessContext,
  GenerationResult,
  NexusClientConfig,
} from './nexus-client';

// MCP client manager
export { MCPClientManager } from './mcp-client/mcp-client';
export type {
  MCPRequest,
  MCPResponse,
  MCPTool,
  MCPResource,
  ToolResult,
  AgentContext,
} from './mcp-client/mcp-client';

// Factory functions
export const createNexusClient = (config?: any): NexusClient => {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [new winston.transports.Console()],
  });

  return new NexusClient(config, logger);
};

export const createMCPClientManager = (nexusBaseUrl?: string): MCPClientManager => {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [new winston.transports.Console()],
  });

  return new MCPClientManager(
    nexusBaseUrl || process.env.NEXUS_URL || 'http://localhost:8000',
    logger
  );
};
