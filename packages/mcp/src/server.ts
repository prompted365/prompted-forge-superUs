/**
 * HTTP Server Entry Point
 * 
 * Production-ready Express server with health checks, metrics endpoint,
 * and graceful shutdown handling. Follows Homeskillet Rhythm™ principles.
 */

import express, { Request, Response } from 'express';
import { register, collectDefaultMetrics } from 'prom-client';
// Temporarily disabled for deployment testing
// import { createObservabilityConfigForEnvironment } from './observability/config';
// import { initializeObservability, shutdownObservability } from './observability';
// import { logger } from './telemetry';

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create observability config - simplified for deployment testing
const isPrometheusEnabled = process.env.PF_PROMETHEUS_ENABLED === 'true';
const isOtelEnabled = process.env.PF_OTEL_ENABLED === 'true';

// Initialize Prometheus default metrics if enabled
if (isPrometheusEnabled) {
  collectDefaultMetrics();
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health endpoint - always available
app.get('/healthz', async (req: Request, res: Response) => {
  const isReadiness = req.query.readiness === '1';
  
  try {
    // Basic liveness check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.3.4',
      environment: NODE_ENV,
      uptime: process.uptime()
    };

    // Extended readiness check
    if (isReadiness) {
      // Check database connectivity (if enabled)
      if (process.env.PF_DB_ENABLED === 'true') {
        // Database connectivity check would go here
        (health as any).database = { status: 'disabled-in-deployment-test' };
      }

      // Check observability systems (if enabled)
      if (isOtelEnabled || isPrometheusEnabled) {
        (health as any).observability = {
          otel: isOtelEnabled ? 'enabled' : 'disabled',
          prometheus: isPrometheusEnabled ? 'enabled' : 'disabled'
        };
      }
    }

    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'unknown-error'
    });
  }
});

// Metrics endpoint - only available when Prometheus is enabled and in development
app.get('/metrics', async (_req: Request, res: Response) => {
  if (!isPrometheusEnabled) {
    return res.status(404).json({
      error: 'Metrics endpoint not available - Prometheus disabled'
    });
  }

  // Only expose in development or staging environments for security
  if (NODE_ENV === 'production' && process.env.PF_METRICS_EXPOSE !== 'true') {
    return res.status(404).json({
      error: 'Metrics endpoint not available in production'
    });
  }

  try {
    const metrics = await register.metrics();
    res.set('Content-Type', register.contentType);
    return res.send(metrics);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to collect metrics',
      details: error instanceof Error ? error.message : 'unknown-error'
    });
  }
});

// Version endpoint
app.get('/version', (_req: Request, res: Response) => {
  res.json({
    version: process.env.npm_package_version || '0.3.4',
    name: '@prompted-forge/mcp',
    environment: NODE_ENV,
    features: {
      orchestrator: process.env.PF_ORCH_ENABLED === 'true',
      context: process.env.PF_CONTEXT_ENABLED === 'true',
      policies: process.env.PF_POLICIES_ENABLED === 'true',
      database: process.env.PF_DB_ENABLED === 'true',
      observability: {
        otel: isOtelEnabled,
        prometheus: isPrometheusEnabled
      }
    }
  });
});

// 404 handler - simplified for deployment testing
// Note: Removed catch-all route due to Express 5.x compatibility issue
// TODO: Re-add proper 404 handling after deployment pipeline verification

// Global error handler
app.use((error: Error, _req: Request, res: Response, _next: any) => {
  console.error('Server error:', error);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
let server: any;
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, starting graceful shutdown...`);
  
  // Stop accepting new connections
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }

  try {
    // Shutdown observability - simplified for deployment testing
    console.log('Observability shutdown complete (simplified)');

    // Database shutdown would go here
    console.log('Database shutdown complete (no-op)');

    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production - log and continue
  if (NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
async function startServer() {
  try {
    console.log('Initializing Prompted Forge MCP Server...');
    
    // Initialize observability first - simplified for deployment testing
    console.log('Observability initialized (simplified)');

    // Database initialization would go here
    console.log('Database initialized (no-op)');

    // Initialize orchestrator (if enabled)
    if (process.env.PF_ORCH_ENABLED === 'true') {
      // Orchestrator initialization would go here
      console.log('Enhanced orchestrator initialized (no-op)');
    }

    // Start HTTP server
    server = app.listen(PORT, () => {
      console.log(`🚀 Prompted Forge MCP Server running on port ${PORT}`);
      console.log(`📊 Environment: ${NODE_ENV}`);
      console.log(`🔍 Health endpoint: http://localhost:${PORT}/healthz`);
      
      if (isPrometheusEnabled && NODE_ENV !== 'production') {
        console.log(`📈 Metrics endpoint: http://localhost:${PORT}/metrics`);
      }
      
      console.log(`🎯 Feature flags:`, {
        orchestrator: process.env.PF_ORCH_ENABLED === 'true',
        context: process.env.PF_CONTEXT_ENABLED === 'true',
        policies: process.env.PF_POLICIES_ENABLED === 'true',
        database: process.env.PF_DB_ENABLED === 'true',
        otel: isOtelEnabled,
        prometheus: isPrometheusEnabled
      });
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export { app, startServer };
