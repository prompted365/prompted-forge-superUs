/**
 * Simple Observability Integration Test
 * 
 * Basic smoke test for OpenTelemetry and Prometheus
 * Following Homeskillet Rhythm™: Keep it simple, test the essentials
 */

import { describe, it, expect } from '@jest/globals';
import { 
  createObservabilityConfigForEnvironment,
  validateObservabilityConfig,
  recordMcpRequestDuration,
  recordDbLatency,
  setCacheHitRate,
  createOrchestratorSpan,
  traceAsyncOperation
} from '../src/observability';
import { MemoryTier } from '@prompted-forge/memory';

describe('Observability Integration', () => {
  describe('Configuration', () => {
    it('should create valid default configuration', () => {
      const config = createObservabilityConfigForEnvironment();
      const validation = validateObservabilityConfig(config);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(config.openTelemetry.sampleRate).toBeGreaterThanOrEqual(0);
      expect(config.openTelemetry.sampleRate).toBeLessThanOrEqual(1);
    });

    it('should handle different environments', () => {
      const devConfig = createObservabilityConfigForEnvironment('development');
      const prodConfig = createObservabilityConfigForEnvironment('production');
      const testConfig = createObservabilityConfigForEnvironment('test');
      
      expect(devConfig.openTelemetry.sampleRate).toBe(1.0);
      expect(prodConfig.openTelemetry.sampleRate).toBe(0.01);
      expect(testConfig.openTelemetry.enabled).toBe(false);
      expect(testConfig.prometheus.enabled).toBe(false);
    });

    it('should validate sample rate bounds', () => {
      // Simulate invalid sample rate via direct configuration
      const invalidConfig = {
        ...createObservabilityConfigForEnvironment(),
        openTelemetry: {
          ...createObservabilityConfigForEnvironment().openTelemetry,
          sampleRate: 1.5
        }
      };
      
      const validation = validateObservabilityConfig(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('openTelemetry.sampleRate must be between 0 and 1');
    });
  });

  describe('Metrics Recording (No-op when disabled)', () => {
    it('should record metrics without throwing when disabled', () => {
      // These should not throw even when observability is not initialized
      expect(() => {
        recordMcpRequestDuration('test', MemoryTier.WORKING, 'success', 10);
        recordDbLatency('test', 'test_table', 'success', 5);
        setCacheHitRate('test_cache', 75.5);
      }).not.toThrow();
    });
  });

  describe('Tracing (No-op when disabled)', () => {
    it('should create spans without throwing when disabled', () => {
      expect(() => {
        const span = createOrchestratorSpan('test_operation', MemoryTier.WORKING);
        span.setAttributes({ test: 'value' });
        span.addEvent('test_event');
        span.end();
      }).not.toThrow();
    });

    it('should trace operations when disabled', async () => {
      const testOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return 'test_result';
      };

      const result = await traceAsyncOperation('test_op', testOperation);
      expect(result).toBe('test_result');
    });

    it('should handle errors in traced operations', async () => {
      const failingOperation = async (): Promise<never> => {
        throw new Error('Test error');
      };

      await expect(
        traceAsyncOperation('failing_op', failingOperation)
      ).rejects.toThrow('Test error');
    });
  });

  describe('Environment Variable Handling', () => {
    it('should handle missing environment variables gracefully', () => {
      // Create config without any environment variables set
      const originalEnv = process.env;
      process.env = {};
      
      const config = createObservabilityConfigForEnvironment();
      
      expect(config.openTelemetry.enabled).toBe(false);
      expect(config.prometheus.enabled).toBe(false);
      expect(config.openTelemetry.serviceName).toBe('prompted-forge-mcp');
      expect(config.openTelemetry.serviceVersion).toBe('0.3.3');
      
      process.env = originalEnv;
    });

    it('should parse boolean flags correctly', () => {
      const originalEnv = process.env;
      
      // Test 'true'
      process.env = { PF_OTEL_ENABLED: 'true', PF_PROMETHEUS_ENABLED: '1' };
      let config = createObservabilityConfigForEnvironment();
      expect(config.openTelemetry.enabled).toBe(true);
      expect(config.prometheus.enabled).toBe(true);
      
      // Test 'false'
      process.env = { PF_OTEL_ENABLED: 'false', PF_PROMETHEUS_ENABLED: '0' };
      config = createObservabilityConfigForEnvironment();
      expect(config.openTelemetry.enabled).toBe(false);
      expect(config.prometheus.enabled).toBe(false);
      
      process.env = originalEnv;
    });

    it('should clamp invalid sample rates', () => {
      const originalEnv = process.env;
      
      // Use test environment to avoid development config overrides
      process.env = { PF_OTEL_SAMPLE_RATE: '1.5', NODE_ENV: 'test' };
      const config = createObservabilityConfigForEnvironment();
      // In test environment, this gets clamped to 1.0
      expect(config.openTelemetry.sampleRate).toBeLessThanOrEqual(1.0);
      
      process.env = { PF_OTEL_SAMPLE_RATE: '-0.5', NODE_ENV: 'test' };
      const config2 = createObservabilityConfigForEnvironment();
      // In test environment, this gets clamped to 0.0
      expect(config2.openTelemetry.sampleRate).toBeGreaterThanOrEqual(0.0);
      
      process.env = originalEnv;
    });
  });
});
