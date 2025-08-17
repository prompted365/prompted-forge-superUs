import axios, { AxiosInstance } from 'axios';
import winston from 'winston';
import { z } from 'zod';
import { AccessValidationResult } from '@prompted-forge/registry';

// MCP Protocol Types
export const MCPRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.any().optional(),
});

export const MCPResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional(),
  }).optional(),
});

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.any(),
});

export const MCPResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

export type MCPRequest = z.infer<typeof MCPRequestSchema>;
export type MCPResponse = z.infer<typeof MCPResponseSchema>;
export type MCPTool = z.infer<typeof MCPToolSchema>;
export type MCPResource = z.infer<typeof MCPResourceSchema>;

// Tool Call Result
export interface ToolResult {
  success: boolean;
  content: string;
  mimeType?: string;
  metadata?: Record<string, any>;
  error?: string;
}

// Agent Context for MCP calls
export interface AgentContext {
  agentId: string;
  tenantId: string;
  roleId: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

// MCP Client Interface
export class MCPClientManager {
  private nexusClient: AxiosInstance;
  private logger: winston.Logger;
  private toolCache: Map<string, MCPTool[]>;
  private resourceCache: Map<string, MCPResource[]>;

  constructor(nexusBaseUrl: string, logger?: winston.Logger) {
    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console()],
    });

    this.nexusClient = axios.create({
      baseURL: nexusBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json,text/event-stream',
      },
    });

    this.toolCache = new Map();
    this.resourceCache = new Map();

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.nexusClient.interceptors.request.use(
      (config) => {
        this.logger.debug('MCP request via Nexus', {
          url: config.url,
          method: config.method,
          data: config.data,
        });
        return config;
      }
    );

    this.nexusClient.interceptors.response.use(
      (response) => {
        this.logger.debug('MCP response via Nexus', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        this.logger.error('MCP error via Nexus', { error });
        return Promise.reject(error);
      }
    );
  }

  // List available tools from MCP servers
  async listTools(serverId?: string): Promise<MCPTool[]> {
    try {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
        params: serverId ? { serverId } : undefined,
      };

      const response = await this.nexusClient.post('/mcp', request);
      const mcpResponse = MCPResponseSchema.parse(response.data);

      if (mcpResponse.error) {
        throw new Error(`MCP Error: ${mcpResponse.error.message}`);
      }

      const tools = mcpResponse.result?.tools || [];
      const validatedTools = tools.map((tool: any) => MCPToolSchema.parse(tool));

      // Cache tools
      if (serverId) {
        this.toolCache.set(serverId, validatedTools);
      }

      this.logger.info('Tools listed', {
        serverId,
        toolCount: validatedTools.length,
      });

      return validatedTools;
    } catch (error) {
      this.logger.error('Failed to list tools', { serverId, error });
      throw error;
    }
  }

  // Search for tools using natural language
  async searchTools(query: string, serverId?: string): Promise<MCPTool[]> {
    try {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'search',
        params: {
          query,
          serverId,
          type: 'tools',
        },
      };

      const response = await this.nexusClient.post('/mcp', request);
      const mcpResponse = MCPResponseSchema.parse(response.data);

      if (mcpResponse.error) {
        throw new Error(`MCP Search Error: ${mcpResponse.error.message}`);
      }

      const tools = mcpResponse.result?.tools || [];
      return tools.map((tool: any) => MCPToolSchema.parse(tool));
    } catch (error) {
      this.logger.error('Failed to search tools', { query, serverId, error });
      throw error;
    }
  }

  // Call a specific tool
  async callTool(
    serverId: string,
    toolName: string,
    params: any,
    agentContext: AgentContext,
    validateAccess?: (context: AgentContext, serverId: string, toolName: string) => Promise<AccessValidationResult>
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate access if validator provided
      if (validateAccess) {
        const accessResult = await validateAccess(agentContext, serverId, toolName);
        if (!accessResult.allowed) {
          return {
            success: false,
            content: '',
            error: `Access denied: ${accessResult.reason}`,
          };
        }

        // Check if approval is required
        if (accessResult.requiredApprovals && accessResult.requiredApprovals.length > 0) {
          this.logger.warn('Tool call requires approval', {
            agentId: agentContext.agentId,
            serverId,
            toolName,
            requiredApprovals: accessResult.requiredApprovals,
          });
          
          return {
            success: false,
            content: '',
            error: `Approval required from: ${accessResult.requiredApprovals.join(', ')}`,
          };
        }
      }

      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: `${agentContext.agentId}-${Date.now()}`,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params,
          serverId,
          agentContext: {
            agentId: agentContext.agentId,
            sessionId: agentContext.sessionId,
          },
        },
      };

      const response = await this.nexusClient.post('/mcp', request);
      const mcpResponse = MCPResponseSchema.parse(response.data);

      const latency = Date.now() - startTime;

      if (mcpResponse.error) {
        this.logger.error('Tool call failed', {
          serverId,
          toolName,
          agentId: agentContext.agentId,
          error: mcpResponse.error,
          latency,
        });

        return {
          success: false,
          content: '',
          error: mcpResponse.error.message,
        };
      }

      this.logger.info('Tool call completed', {
        serverId,
        toolName,
        agentId: agentContext.agentId,
        latency,
      });

      return {
        success: true,
        content: mcpResponse.result?.content || '',
        mimeType: mcpResponse.result?.mimeType,
        metadata: {
          latency,
          serverId,
          toolName,
          agentId: agentContext.agentId,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error('Tool call error', {
        serverId,
        toolName,
        agentId: agentContext.agentId,
        latency,
        error,
      });

      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // List available resources
  async listResources(serverId?: string): Promise<MCPResource[]> {
    try {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'resources/list',
        params: serverId ? { serverId } : undefined,
      };

      const response = await this.nexusClient.post('/mcp', request);
      const mcpResponse = MCPResponseSchema.parse(response.data);

      if (mcpResponse.error) {
        throw new Error(`MCP Error: ${mcpResponse.error.message}`);
      }

      const resources = mcpResponse.result?.resources || [];
      const validatedResources = resources.map((resource: any) => 
        MCPResourceSchema.parse(resource)
      );

      // Cache resources
      if (serverId) {
        this.resourceCache.set(serverId, validatedResources);
      }

      return validatedResources;
    } catch (error) {
      this.logger.error('Failed to list resources', { serverId, error });
      throw error;
    }
  }

  // Read a specific resource
  async readResource(
    serverId: string,
    resourceUri: string,
    agentContext: AgentContext
  ): Promise<ToolResult> {
    try {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: `${agentContext.agentId}-${Date.now()}`,
        method: 'resources/read',
        params: {
          uri: resourceUri,
          serverId,
        },
      };

      const response = await this.nexusClient.post('/mcp', request);
      const mcpResponse = MCPResponseSchema.parse(response.data);

      if (mcpResponse.error) {
        return {
          success: false,
          content: '',
          error: mcpResponse.error.message,
        };
      }

      return {
        success: true,
        content: mcpResponse.result?.contents || '',
        mimeType: mcpResponse.result?.mimeType,
      };
    } catch (error) {
      this.logger.error('Failed to read resource', {
        serverId,
        resourceUri,
        agentId: agentContext.agentId,
        error,
      });

      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Subscribe to resource updates
  async subscribeToResource(
    serverId: string,
    resourceUri: string,
    agentContext: AgentContext,
    onUpdate: (content: string) => void
  ): Promise<() => void> {
    try {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: `${agentContext.agentId}-${Date.now()}`,
        method: 'resources/subscribe',
        params: {
          uri: resourceUri,
          serverId,
          agentContext: {
            agentId: agentContext.agentId,
            sessionId: agentContext.sessionId,
          },
        },
      };

      // This would typically use Server-Sent Events or WebSocket
      // For now, simulate with polling
      const response = await this.nexusClient.post('/mcp', request);
      const mcpResponse = MCPResponseSchema.parse(response.data);

      if (mcpResponse.error) {
        throw new Error(`Subscription failed: ${mcpResponse.error.message}`);
      }

      this.logger.info('Subscribed to resource', {
        serverId,
        resourceUri,
        agentId: agentContext.agentId,
      });

      // Return unsubscribe function
      return () => {
        this.logger.info('Unsubscribed from resource', {
          serverId,
          resourceUri,
          agentId: agentContext.agentId,
        });
      };
    } catch (error) {
      this.logger.error('Failed to subscribe to resource', {
        serverId,
        resourceUri,
        agentId: agentContext.agentId,
        error,
      });
      throw error;
    }
  }

  // Execute multiple tools in sequence
  async executeToolChain(
    toolCalls: Array<{
      serverId: string;
      toolName: string;
      params: any;
    }>,
    agentContext: AgentContext,
    validateAccess?: (context: AgentContext, serverId: string, toolName: string) => Promise<AccessValidationResult>
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      const result = await this.callTool(
        call.serverId,
        call.toolName,
        call.params,
        agentContext,
        validateAccess
      );
      
      results.push(result);

      // Stop chain if any tool fails
      if (!result.success) {
        this.logger.warn('Tool chain stopped due to failure', {
          agentId: agentContext.agentId,
          failedTool: call.toolName,
          error: result.error,
        });
        break;
      }
    }

    return results;
  }

  // Get cached tools
  getCachedTools(serverId: string): MCPTool[] | undefined {
    return this.toolCache.get(serverId);
  }

  // Get cached resources
  getCachedResources(serverId: string): MCPResource[] | undefined {
    return this.resourceCache.get(serverId);
  }

  // Clear cache
  clearCache(): void {
    this.toolCache.clear();
    this.resourceCache.clear();
  }
}
