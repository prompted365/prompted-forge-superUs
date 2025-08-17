/**
 * MCP Error Mapping Tests
 * 
 * Comprehensive test coverage ensuring every MCP error path maps to standardized MemoryError codes
 * No raw error strings should leak through to clients
 */

import { describe, it, expect } from '@jest/globals';
import { createMCPHandler, MCPHandlers } from '../src/handlers/mcp-handler-wrapper';

describe('MCP Error Mapping', () => {
  
  describe('Validation Errors', () => {
    it('should map empty request to MCP_PAYLOAD_VALIDATION error', async () => {
      const result = await MCPHandlers['memory.store']({});
      
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(-32602); // Invalid params per JSON-RPC
      expect(result.error?.message).toContain('Invalid parameters');
      expect(result.error?.data?.traceId).toBeDefined();
    });

    it('should map missing required fields to validation errors', async () => {
      const invalidRequest = {
        id: 'test-123',
        method: 'memory.store',
        params: {
          operation: 'STORE',
          // Missing required 'content' field
        }
      };

      const result = await MCPHandlers['memory.store'](invalidRequest);
      
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(-32602); // Invalid params
      expect(result.error?.message).toContain('Invalid parameters');
      expect(result.error?.data).toBeDefined(); // Validation issues are in the data field
    });

    it('should map malformed JSON to validation errors', async () => {
      const result = await MCPHandlers['memory.search']('invalid-json');
      
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(-32602); // Invalid params
      expect(result.telemetry).toBeDefined();
      expect(result.telemetry?.operation).toBe('memory.search');
    });

    it('should handle type mismatch in operation field', async () => {
      const invalidRequest = {
        id: 'test-123',
        method: 'memory.store',
        params: {
          operation: 123, // Should be string enum
          content: 'test content'
        }
      };

      const result = await MCPHandlers['memory.store'](invalidRequest);
      expect(result.error?.code).toBe(-32602); // Invalid params
      expect(result.error?.data).toBeDefined();
    });
  });

  describe('Operation-Specific Errors', () => {
    it('should map store errors consistently', async () => {
      const storeTests = [
        {
          name: 'empty content',
          request: {
            id: 'test-1',
            method: 'memory.store',
            params: { operation: 'STORE', content: '' }
          }
        },
        {
          name: 'null content',
          request: {
            id: 'test-2', 
            method: 'memory.store',
            params: { operation: 'STORE', content: null }
          }
        },
        {
          name: 'numeric content',
          request: {
            id: 'test-3',
            method: 'memory.store', 
            params: { operation: 'STORE', content: 12345 }
          }
        }
      ];

      for (const test of storeTests) {
        const result = await MCPHandlers['memory.store'](test.request);
        
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe(-32602); // These are validation errors, not internal errors
        expect(result.telemetry?.operation).toBe('memory.store');
      }
    });

    it('should map search errors consistently', async () => {
      const searchTests = [
        {
          name: 'missing query',
          request: {
            id: 'test-1',
            method: 'memory.search',
            params: { operation: 'SEARCH' } // Missing query
          }
        },
        {
          name: 'empty query string',
          request: {
            id: 'test-2',
            method: 'memory.search',
            params: { operation: 'SEARCH', query: '' }
          }
        }
      ];

      for (const test of searchTests) {
        const result = await MCPHandlers['memory.search'](test.request);
        
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe(-32602); // Invalid params
        expect(result.error?.message).toContain('Invalid parameters');
      }
    });

    it('should map retrieve errors consistently', async () => {
      const retrieveRequest = {
        id: 'test-1',
        method: 'memory.retrieve', 
        params: { operation: 'RETRIEVE' } // Missing query
      };

      const result = await MCPHandlers['memory.retrieve'](retrieveRequest);
      
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(-32602); // Invalid params
      expect(result.telemetry?.operation).toBe('memory.retrieve');
    });
  });

  describe('Internal Error Handling', () => {
    it('should map unexpected errors to internal server errors', async () => {
      // Create a handler that throws an unexpected error
      const faultyHandler = createMCPHandler(
        'memory.test',
        async () => {
          throw new Error('Unexpected internal error');
        }
      );

      const result = await faultyHandler({
        id: 'test-1',
        method: 'memory.test',
        params: {}
      });

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(5000); // Internal server error
      expect(result.error?.message).toBe('Internal server error');
      expect(result.error?.data?.traceId).toBeDefined();
      expect(result.telemetry).toBeDefined();
    });

// Note: MemoryErrorFactory preservation test will be added when memory package is integrated
  });

  describe('Trace Context Propagation', () => {
    it('should preserve traceId and requestId in error responses', async () => {
      const request = {
        id: 'test-1',
        method: 'memory.store',
        traceId: 'trace-abc-123',
        requestId: 'req-xyz-456',
        params: {} // Invalid - missing operation
      };

      const result = await MCPHandlers['memory.store'](request);
      
      expect(result.error?.data?.traceId).toBe('trace-abc-123');
      expect(result.error?.data?.requestId).toBe('req-xyz-456');
    });

    it('should generate traceId and requestId when missing', async () => {
      const request = {
        id: 'test-1',
        method: 'memory.store',
        // No traceId or requestId provided
        params: {}
      };

      const result = await MCPHandlers['memory.store'](request);
      
      expect(result.error?.data?.traceId).toBeDefined();
      expect(result.error?.data?.requestId).toBeDefined();
      expect(typeof result.error?.data?.traceId).toBe('string');
      expect(typeof result.error?.data?.requestId).toBe('string');
    });
  });

  describe('Telemetry Consistency', () => {
    it('should include telemetry in all error responses', async () => {
      const testCases = [
        { handler: MCPHandlers['memory.store'], operation: 'memory.store' },
        { handler: MCPHandlers['memory.search'], operation: 'memory.search' },
        { handler: MCPHandlers['memory.retrieve'], operation: 'memory.retrieve' },
      ];

      for (const testCase of testCases) {
        const result = await testCase.handler({ invalid: 'request' });
        
        expect(result.telemetry).toBeDefined();
        expect(result.telemetry?.operation).toBe(testCase.operation);
        expect(result.telemetry?.latency_ms).toBeGreaterThanOrEqual(0);
        expect(typeof result.telemetry?.latency_ms).toBe('number');
      }
    });

    it('should measure latency accurately in error cases', async () => {
      const startTime = Date.now();
      const result = await MCPHandlers['memory.store']({});
      const endTime = Date.now();
      
      expect(result.telemetry?.latency_ms).toBeGreaterThanOrEqual(0);
      expect(result.telemetry?.latency_ms).toBeLessThanOrEqual(endTime - startTime + 5); // Allow 5ms buffer
    });
  });

  // Note: Error code ranges test will be added when memory package is integrated

  describe('No Raw Error Strings', () => {
    it('should never expose raw JavaScript errors to clients', async () => {
      const handlerWithJSError = createMCPHandler(
        'memory.test',
        async () => {
          // Simulate various JS errors that could occur
          const errors = [
            new TypeError('Cannot read property of undefined'),
            new ReferenceError('Variable is not defined'), 
            new SyntaxError('Unexpected token'),
            new RangeError('Array index out of bounds'),
          ];
          
          throw errors[Math.floor(Math.random() * errors.length)];
        }
      );

      for (let i = 0; i < 10; i++) {
        const result = await handlerWithJSError({
          id: `test-${i}`,
          method: 'memory.test',
          params: {}
        });

        // Should always be standardized internal server error
        expect(result.error?.code).toBe(5000);
        expect(result.error?.message).toBe('Internal server error');
        
        // Should not contain raw JS error messages
        expect(result.error?.message).not.toContain('Cannot read property');
        expect(result.error?.message).not.toContain('is not defined');
        expect(result.error?.message).not.toContain('Unexpected token');
      }
    });
  });

});
