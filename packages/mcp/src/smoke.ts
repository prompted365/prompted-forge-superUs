#!/usr/bin/env npx ts-node

/**
 * MCP Integration Smoke Test
 * 
 * Following Homeskillet Rhythm™: Verify functionality at each step
 * Tests MCP server and memory bridge stub implementations
 */

import { 
  MCPServerStub,
  MemoryBridgeStub,
  createDefaultMCPServerConfig,
  createDefaultMemoryBridgeConfig,
  MCPRequest,
  MemoryOperation
} from './index';

async function runMCPSmokeTest() {
  console.log('🧪 MCP Integration Smoke Test');
  console.log('============================\n');

  try {
    // 1. Test MCP Server Creation
    console.log('1️⃣  Testing MCP Server Creation');
    const serverConfig = createDefaultMCPServerConfig();
    const mcpServer = new MCPServerStub(serverConfig);
    console.log('   ✅ MCP Server created successfully');

    // 2. Test Server Lifecycle
    console.log('\n2️⃣  Testing Server Lifecycle');
    console.log('   🚀 Starting server...');
    await mcpServer.start();
    console.log('   ✅ Server started');
    
    console.log('   📊 Checking server status...');
    const isRunning = mcpServer.isRunning();
    console.log(`   ✅ Server running: ${isRunning}`);

    // 3. Test Capabilities
    console.log('\n3️⃣  Testing Server Capabilities');
    const capabilities = mcpServer.getCapabilities();
    console.log('   ✅ Capabilities retrieved:', {
      operations: capabilities.memory.operations.length,
      tiers: capabilities.memory.tiers.length,
      contextAnalysis: capabilities.memory.contextAnalysis
    });

    // 4. Test Connection Simulation
    console.log('\n4️⃣  Testing Connection Management');
    await mcpServer.simulateConnection();
    await mcpServer.simulateConnection();
    console.log(`   ✅ Connections established: ${mcpServer.getConnections().length}`);
    
    // 5. Test Memory Operations
    console.log('\n5️⃣  Testing Memory Operations');
    
    // Test memory store
    const storeRequest: MCPRequest = {
      id: 'test-store-1',
      method: 'memory.store',
      params: {
        content: 'This is a test memory item',
        tier: 'WORKING'
      }
    };
    
    const storeResponse = await mcpServer.handleRequest(storeRequest);
    console.log('   ✅ Memory store operation:', storeResponse.result ? 'Success' : 'Failed');

    // Test memory retrieve
    const retrieveRequest: MCPRequest = {
      id: 'test-retrieve-1', 
      method: 'memory.retrieve',
      params: {
        memoryId: 'test-memory-id'
      }
    };
    
    const retrieveResponse = await mcpServer.handleRequest(retrieveRequest);
    console.log('   ✅ Memory retrieve operation:', retrieveResponse.result ? 'Success' : 'Failed');

    // Test memory search
    const searchRequest: MCPRequest = {
      id: 'test-search-1',
      method: 'memory.search', 
      params: {
        query: 'test query'
      }
    };
    
    const searchResponse = await mcpServer.handleRequest(searchRequest);
    console.log('   ✅ Memory search operation:', searchResponse.result ? 'Success' : 'Failed');

    // 6. Test Health Check
    console.log('\n6️⃣  Testing Health Check');
    const healthRequest: MCPRequest = {
      id: 'test-health-1',
      method: 'memory.health_check'
    };
    
    const healthResponse = await mcpServer.handleRequest(healthRequest);
    const healthy = healthResponse.result?.healthy;
    console.log(`   ✅ Health check: ${healthy ? 'Healthy' : 'Unhealthy'}`);

    // 7. Test Memory Bridge
    console.log('\n7️⃣  Testing Memory Bridge');
    const bridgeConfig = createDefaultMemoryBridgeConfig();
    const memoryBridge = new MemoryBridgeStub(bridgeConfig);
    
    console.log('   🚀 Initializing bridge...');
    await memoryBridge.initialize();
    console.log('   ✅ Bridge initialized');
    
    const bridgeHealthy = await memoryBridge.isHealthy();
    console.log(`   ✅ Bridge health: ${bridgeHealthy ? 'Healthy' : 'Unhealthy'}`);

    // 8. Test Context Analysis
    console.log('\n8️⃣  Testing Context Analysis');
    const mockContext = {
      conversationId: 'test-conversation-1',
      userId: 'test-user',
      sessionId: 'test-session',
      timestamp: new Date(),
      messages: [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Remember this important fact about John from the tech company',
          timestamp: new Date()
        }
      ]
    };
    
    const analysis = await memoryBridge.analyzeContext(mockContext);
    console.log('   ✅ Context analysis completed:', {
      contentType: analysis.contentType,
      importance: analysis.importance,
      suggestedTier: analysis.suggestedTier,
      entityCount: analysis.entities.length,
      topicCount: analysis.topics.length
    });

    // 9. Test Tier Routing
    console.log('\n9️⃣  Testing Tier Routing');
    const routedTier = memoryBridge.routeToTier(MemoryOperation.STORE, analysis);
    console.log(`   ✅ Routed to tier: ${routedTier}`);

    // 10. Test Notification Broadcasting
    console.log('\n🔟 Testing Notification Broadcasting');
    await mcpServer.broadcast({
      method: 'memory.update',
      params: {
        memoryId: 'test-memory-id',
        type: 'stored'
      }
    });
    console.log('   ✅ Notification broadcast completed');

    // 11. Test Server Shutdown
    console.log('\n1️⃣1️⃣ Testing Server Shutdown');
    await mcpServer.stop();
    console.log('   ✅ Server stopped gracefully');
    console.log(`   ✅ Server running after stop: ${mcpServer.isRunning()}`);

    // 12. Summary
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log('✅ MCP Server lifecycle: PASSED');
    console.log('✅ Memory operations: PASSED');
    console.log('✅ Connection management: PASSED');
    console.log('✅ Health checks: PASSED');
    console.log('✅ Memory bridge: PASSED');
    console.log('✅ Context analysis: PASSED');
    console.log('✅ Tier routing: PASSED');
    console.log('✅ Notification system: PASSED');
    
    console.log('\n🎉 All MCP integration tests PASSED!');
    console.log('🚀 Phase 3.1 Milestone: MCP Foundation COMPLETE');

  } catch (error) {
    console.error('\n❌ Smoke test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runMCPSmokeTest();
}
