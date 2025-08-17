import express from 'express';
import cors from 'cors';
import winston from 'winston';
import path from 'path';
import { 
  createRegistryManager,
  createDomainMapper,
  ModelTier,
} from '@prompted-forge/registry';
import { 
  createNexusClient,
  createMCPClientManager,
} from '@prompted-forge/runtime';

// Create logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()],
});

// Initialize components
const registryManager = createRegistryManager();
const domainMapper = createDomainMapper();
const nexusClient = createNexusClient();
const mcpClient = createMCPClientManager();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Root route - serve the web UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health endpoint
app.get('/health', async (req, res) => {
  try {
    const nexusHealthy = await nexusClient.healthCheck();
    const models = await nexusClient.listModels();
    const stats = registryManager.getRegistryStats();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        nexus: nexusHealthy ? 'healthy' : 'unhealthy',
        registry: 'healthy',
        models: models.length,
      },
      stats,
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Models endpoint
app.get('/api/models', async (req, res) => {
  try {
    const models = await nexusClient.listModels();
    res.json({ models });
  } catch (error) {
    logger.error('Failed to fetch models:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Chat completion endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, context, agentId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const businessContext = {
      domain: context?.domain || 'general',
      priority: context?.priority || 'medium',
      budget: context?.budget,
      compliance: context?.compliance,
    };

    const result = await nexusClient.requestSampling(
      prompt,
      businessContext,
      agentId
    );

    res.json({ result });
  } catch (error) {
    logger.error('Chat completion failed:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Domain mapping endpoint
app.post('/api/transform', async (req, res) => {
  try {
    const { mappingId, entityType, data } = req.body;

    if (!mappingId || !entityType || !data) {
      return res.status(400).json({ 
        error: 'mappingId, entityType, and data are required' 
      });
    }

    const transformed = await domainMapper.transformEntity(
      mappingId,
      entityType,
      data
    );

    res.json({ transformed });
  } catch (error) {
    logger.error('Domain transformation failed:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Registry stats endpoint
app.get('/api/registry/stats', (req, res) => {
  try {
    const stats = registryManager.getRegistryStats();
    res.json({ stats });
  } catch (error) {
    logger.error('Failed to get registry stats:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Create a demo tenant on startup
async function initializeDemoData() {
  try {
    const demoTenant = await registryManager.createTenant({
      name: 'Demo Organization',
      tier: 'professional',
      samplingLimits: {
        maxTokensPerDay: 50000,
        maxCostPerMonth: 200,
        allowedModels: [ModelTier.STANDARD, ModelTier.PREMIUM],
        rateLimits: {
          requestsPerMinute: 30,
          requestsPerHour: 500,
          requestsPerDay: 5000,
        },
      },
      allowedServers: ['nexus-llm', 'nexus-mcp'],
      allowedRoles: ['user', 'admin'],
      securityPolicies: ['demo-policy'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info(`Created demo tenant: ${demoTenant}`);
  } catch (error) {
    logger.error('Failed to create demo tenant:', error);
  }
}

// Start server
async function startServer() {
  try {
    // Test Nexus connectivity
    const isHealthy = await nexusClient.healthCheck();
    if (!isHealthy) {
      logger.warn('Nexus is not healthy, but continuing...');
    }

    // Initialize demo data
    await initializeDemoData();

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 Prompted Forge Server running at http://localhost:${PORT}`);
      logger.info('🌐 Web UI available at: http://localhost:' + PORT);
      logger.info('Available API endpoints:');
      logger.info('  GET  /health              - Health check');
      logger.info('  GET  /api/models          - List available models');
      logger.info('  POST /api/chat            - Chat completion');
      logger.info('  POST /api/transform       - Domain transformation');
      logger.info('  GET  /api/registry/stats  - Registry statistics');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down Prompted Forge Server...');
  process.exit(0);
});

// Start the server
startServer();
