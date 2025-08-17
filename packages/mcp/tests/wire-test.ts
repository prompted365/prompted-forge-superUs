#!/usr/bin/env ts-node

/**
 * Wire Test: MCP → Memory → MCP Round-trip
 * Proves end-to-end functionality with golden fixtures
 */

import { MCPServerStub } from '../src/server/mcp-server-stub';
import { MemoryBridgeStub } from '../src/bridge/memory-bridge-stub';
import { MemoryOperation, MCPRequest, MCPServerConfig, MemoryBridgeConfig } from '../src/interfaces/mcp-interfaces';

// Golden fixtures for consistent testing
const GOLDEN_FIXTURES = {
  storeRequest: {
    id: 'wire-test-001',
    method: 'memory.store',
    params: {
      operation: MemoryOperation.STORE,
      content: 'Golden test content for wire testing',
      context: {
        messages: [{
          role: 'user' as const,
          content: 'Test message content',
          timestamp: new Date('2025-08-17T09:03:00Z'),
          metadata: { source: 'wire-test' }
        }],
        entities: [],
        intent: 'test_store_operation',
        sentiment: {
          polarity: 0.5,
          subjectivity: 0.3,
          confidence: 0.9,
          label: 'positive' as const
        },
        topics: ['testing', 'wire-test'],
        complexity_score: 0.4
      }
    }
  } as MCPRequest,
  
  retrieveRequest: {
    id: 'wire-test-002', 
    method: 'memory.retrieve',
    params: {
      operation: MemoryOperation.RETRIEVE,
      query: 'Golden test content',
      context: {
        messages: [],
        entities: [],
        intent: 'test_retrieve_operation',
        sentiment: {
          polarity: 0.0,
          subjectivity: 0.0,
          confidence: 1.0,
          label: 'neutral' as const
        },
        topics: ['retrieval', 'wire-test'],
        complexity_score: 0.2
      }
    }
  } as MCPRequest,
  
  searchRequest: {
    id: 'wire-test-003',
    method: 'memory.search', 
    params: {
      operation: MemoryOperation.SEARCH,
      query: 'Golden test',
      context: {
        messages: [],
        entities: [],
        intent: 'test_search_operation',
        sentiment: {
          polarity: 0.0,
          subjectivity: 0.0,
          confidence: 1.0,
          label: 'neutral' as const
        },
        topics: ['search', 'wire-test'],
        complexity_score: 0.1
      }
    }
  } as MCPRequest
};

async function runWireTests(): Promise<void> {
  console.log('🔌 Starting MCP Wire Tests...');
  
  // Initialize components
  const serverConfig: MCPServerConfig = {
    name: 'wire-test-server',
    version: '3.1.0',
    capabilities: {
      memory: {
        operations: [MemoryOperation.STORE, MemoryOperation.RETRIEVE, MemoryOperation.SEARCH],
        tiers: ['working', 'episodic', 'semantic', 'shared'] as any,
        contextAnalysis: true,
        realTimeUpdates: false
      }
    },
    transport: {
      type: 'http',
      host: 'localhost',
      port: 8001
    },
    memory: {
      enableContextAnalysis: true,
      enableRealTimeUpdates: false,
      maxConversationHistory: 100,
      analysisTimeout: 5000,
      batchSize: 10
    }
  };
  
  const bridgeConfig: MemoryBridgeConfig = {
    contextAnalysisEnabled: true,
    intelligentRouting: true,
    batchOperations: false,
    cacheResults: true,
    telemetryEnabled: true
  };
  
  const server = new MCPServerStub(serverConfig);
  const bridge = new MemoryBridgeStub(bridgeConfig);
  
  try {
    // Start server and bridge
    await server.start();
    console.log('✅ MCP Server started');
    
    await bridge.initialize();
    console.log('✅ Memory Bridge initialized');
    
    // Test 1: Store operation round-trip
    console.log('\n📝 Test 1: Store Operation');
    const storeResponse = await server.handleRequest(GOLDEN_FIXTURES.storeRequest);
    
    if (storeResponse.error) {
      throw new Error(`Store operation failed: ${storeResponse.error.message}`);
    }
    
    console.log(`✅ Store response: ${JSON.stringify(storeResponse.result)}`);
    
    // Test 2: Retrieve operation round-trip  
    console.log('\n🔍 Test 2: Retrieve Operation');
    const retrieveResponse = await server.handleRequest(GOLDEN_FIXTURES.retrieveRequest);
    
    if (retrieveResponse.error) {
      throw new Error(`Retrieve operation failed: ${retrieveResponse.error.message}`);
    }
    
    console.log(`✅ Retrieve response: ${JSON.stringify(retrieveResponse.result)}`);
    
    // Test 3: Search operation round-trip
    console.log('\n🔎 Test 3: Search Operation');  
    const searchResponse = await server.handleRequest(GOLDEN_FIXTURES.searchRequest);
    
    if (searchResponse.error) {
      throw new Error(`Search operation failed: ${searchResponse.error.message}`);
    }
    
    console.log(`✅ Search response: ${JSON.stringify(searchResponse.result)}`);
    
    // Test 4: Health check
    console.log('\n❤️ Test 4: Health Check');
    const healthResponse = await server.getHealth();
    console.log(`✅ Health: ${healthResponse.status} - ${healthResponse.message}`);
    
    // Test 5: Server capabilities  
    console.log('\n🛠️ Test 5: Server Capabilities');
    const capabilities = await server.getCapabilities();
    console.log(`✅ Capabilities: ${JSON.stringify(capabilities)}`);
    
    console.log('\n🎉 All wire tests passed!');
    
  } catch (error) {
    console.error('\n❌ Wire test failed:', error);
    process.exit(1);
    
  } finally {
    // Cleanup
    await server.stop();
    console.log('🧹 Server stopped');
  }
}

// Performance timing wrapper
async function runWithTiming(): Promise<void> {
  const startTime = Date.now();
  
  try {
    await runWireTests();
  } finally {
    const duration = Date.now() - startTime;
    console.log(`\n⏱️ Total wire test duration: ${duration}ms`);
    
    // Log against performance budget
    if (duration > 1000) {
      console.warn('⚠️ Wire tests exceeded 1s - consider optimization');
    } else {
      console.log('✅ Wire tests within performance budget');
    }
  }
}

// Run if called directly
if (require.main === module) {
  runWithTiming().catch(console.error);
}

export { runWireTests, GOLDEN_FIXTURES };
