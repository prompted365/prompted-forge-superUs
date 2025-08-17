/**
 * Health and Version Endpoints for MCP Server
 * Phase 3.2 - Essential monitoring and diagnostics
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  memory_tiers: {
    working: 'available' | 'degraded' | 'unavailable';
    episodic: 'available' | 'degraded' | 'unavailable';  
    semantic: 'available' | 'degraded' | 'unavailable';
    shared: 'available' | 'degraded' | 'unavailable';
  };
  metrics: {
    requests_total: number;
    requests_per_second: number;
    p95_latency_ms: number;
    error_rate: number;
  };
}

interface VersionResponse {
  version: string;
  protocol_version: string;
  build_sha: string;
  build_date: string;
  node_version: string;
  memory_impl: 'stub' | 'full';
}

/**
 * Get current package version and build info
 */
function getVersionInfo(): VersionResponse {
  try {
    const packagePath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    return {
      version: packageJson.version || '0.1.0',
      protocol_version: '3.2.0',
      build_sha: process.env.GIT_SHA || process.env.GITHUB_SHA || 'local-dev',
      build_date: process.env.BUILD_DATE || new Date().toISOString(),
      node_version: process.version,
      memory_impl: (process.env.PF_MEMORY_IMPL as 'stub' | 'full') || 'stub',
    };
  } catch (error) {
    return {
      version: '0.1.0',
      protocol_version: '3.2.0', 
      build_sha: 'unknown',
      build_date: new Date().toISOString(),
      node_version: process.version,
      memory_impl: 'stub',
    };
  }
}

/**
 * Health check endpoint - reports system status and key metrics
 */
export async function handleHealthCheck(): Promise<HealthResponse> {
  const startTime = process.uptime();
  const version = getVersionInfo();
  
  // TODO: Replace with real health checks in Phase 3.3
  const mockMetrics = {
    requests_total: Math.floor(Math.random() * 10000),
    requests_per_second: Math.floor(Math.random() * 100),
    p95_latency_ms: Math.floor(Math.random() * 50),
    error_rate: Math.random() * 0.05, // < 5% error rate
  };

  // Determine overall health status
  const isHealthy = mockMetrics.error_rate < 0.05 && mockMetrics.p95_latency_ms < 100;
  const isDegraded = mockMetrics.error_rate < 0.1 && mockMetrics.p95_latency_ms < 250;

  return {
    status: isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: startTime,
    version: version.version,
    memory_tiers: {
      working: 'available',
      episodic: 'available', 
      semantic: 'available',
      shared: 'available',
    },
    metrics: mockMetrics,
  };
}

/**
 * Version endpoint - returns build and protocol information
 */
export async function handleVersionCheck(): Promise<VersionResponse> {
  return getVersionInfo();
}

/**
 * Express.js compatible middleware handlers
 */
export function createHealthHandler() {
  return async (_req: any, res: any) => {
    try {
      const health = await handleHealthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  };
}

export function createVersionHandler() {
  return async (_req: any, res: any) => {
    try {
      const version = await handleVersionCheck();
      res.status(200).json(version);
    } catch (error) {
      res.status(500).json({
        error: 'Version check failed',
        timestamp: new Date().toISOString(),
      });
    }
  };
}
