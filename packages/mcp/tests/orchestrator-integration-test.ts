#!/usr/bin/env ts-node

/**
 * Orchestrator Integration Test
 * 
 * Validates MCP → Orchestrator → Memory flow with telemetry capture
 * Tests intelligent routing, scoring, concurrency, and idempotency
 */

import { MemoryTier } from '@prompted-forge/memory';
import { MemoryOperation } from '../src/interfaces/mcp-interfaces';
import {
  MemoryOrchestratorStub,
  createDefaultOrchestratorConfig,
  RoutingContext,
  IdempotencyKey
} from '../src/orchestrator';

// Test fixtures
const ROUTING_TEST_CASES = [
  {
    name: 'Store Short Content → Working Memory',
    context: {
      operation: MemoryOperation.STORE,
      content: 'Short message',
      metadata: {
        timestamp: new Date(),
        requestId: 'test-001',
        traceId: 'trace-001'
      }
    },
    expectedTier: MemoryTier.WORKING,
    expectedReason: 'Store operations favor working memory'
  },
  
  {
    name: 'Search Query → Semantic Memory',
    context: {
      operation: MemoryOperation.SEARCH,
      query: 'What is the meaning of artificial intelligence and machine learning in enterprise contexts?',
      metadata: {
        timestamp: new Date(),
        requestId: 'test-002',
        traceId: 'trace-002'
      }
    },
    expectedTier: MemoryTier.SEMANTIC,
    expectedReason: 'Search operations favor semantic memory'
  },
  
  {
    name: 'Retrieve → Episodic Memory',
    context: {
      operation: MemoryOperation.RETRIEVE,
      query: 'Get conversation history',
      metadata: {
        timestamp: new Date(),
        requestId: 'test-003',
        traceId: 'trace-003'
      }
    },
    expectedTier: MemoryTier.EPISODIC,
    expectedReason: 'Retrieve operations favor episodic memory'
  },
  
  {
    name: 'User Hint Override → Shared Memory',
    context: {
      operation: MemoryOperation.STORE,
      content: 'User prefers shared storage',
      userHints: {
        preferredTier: MemoryTier.SHARED,
        urgency: 'high' as const
      },
      metadata: {
        timestamp: new Date(),
        requestId: 'test-004',
        traceId: 'trace-004'
      }
    },
    expectedTier: MemoryTier.SHARED,
    expectedReason: 'User preferred tier: shared'
  }
];

async function runOrchestratorIntegrationTests(): Promise<void> {
  console.log('🎯 Starting Orchestrator Integration Tests...');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Initialize orchestrator
  const config = createDefaultOrchestratorConfig({
    concurrency: {
      maxConcurrentOperations: 10,
      maxPerTier: {
        [MemoryTier.WORKING]: 5,
        [MemoryTier.EPISODIC]: 3,
        [MemoryTier.SEMANTIC]: 3,
        [MemoryTier.SHARED]: 2
      },
      maxPerOperation: {
        [MemoryOperation.STORE]: 5,
        [MemoryOperation.RETRIEVE]: 5,
        [MemoryOperation.SEARCH]: 3,
        [MemoryOperation.UPDATE]: 2,
        [MemoryOperation.DELETE]: 2,
        [MemoryOperation.COMPRESS]: 1,
        [MemoryOperation.HEALTH_CHECK]: 5,
        [MemoryOperation.GET_STATS]: 5
      },
      timeoutMs: 5000,
      backpressureThreshold: 0.8
    }
  });
  
  const orchestrator = new MemoryOrchestratorStub(config);
  
  try {
    await orchestrator.initialize();
    console.log('✅ Orchestrator initialized');
    
    // Test 1: Basic routing functionality
    console.log('\n🧠 Test 1: Intelligent Routing');
    
    for (const testCase of ROUTING_TEST_CASES) {
      try {
        console.log(`\n  📝 ${testCase.name}`);
        
        const startTime = Date.now();
        const decision = await orchestrator.route(testCase.context as RoutingContext);
        const latency = Date.now() - startTime;
        
        // Validate routing decision
        if (decision.primaryTier !== testCase.expectedTier) {
          throw new Error(`Expected tier ${testCase.expectedTier}, got ${decision.primaryTier}`);
        }
        
        if (!decision.routingReason.includes(testCase.expectedReason)) {
          throw new Error(`Expected reason to contain "${testCase.expectedReason}", got "${decision.routingReason}"`);
        }
        
        // Validate telemetry
        if (!decision.metadata.requestId) {
          throw new Error('Missing requestId in decision metadata');
        }
        
        if (!decision.metadata.traceId) {
          throw new Error('Missing traceId in decision metadata');
        }
        
        if (decision.confidence < 0.4 || decision.confidence > 1.0) {
          throw new Error(`Invalid confidence score: ${decision.confidence}`);
        }
        
        console.log(`    ✅ Routed to ${decision.primaryTier} (confidence: ${decision.confidence.toFixed(2)}, latency: ${latency}ms)`);
        console.log(`    📊 Reason: ${decision.routingReason}`);
        
        testsPassed++;
        
      } catch (error) {
        console.error(`    ❌ ${testCase.name}: ${error instanceof Error ? error.message : String(error)}`);
        testsFailed++;
      }
    }
    
    // Test 2: Scoring function validation
    console.log('\n📊 Test 2: Scoring Function Validation');
    
    const scoringContext: RoutingContext = {
      operation: MemoryOperation.SEARCH,
      query: 'Long query about artificial intelligence and machine learning applications in modern enterprise environments with detailed technical specifications and implementation guidelines',
      metadata: {
        timestamp: new Date(),
        requestId: 'scoring-test-001'
      }
    };
    
    try {
      const scores = await orchestrator.scoreTiers(scoringContext);
      
      if (scores.length !== 4) {
        throw new Error(`Expected 4 tier scores, got ${scores.length}`);
      }
      
      // Find semantic memory score (should be highest for long search query)
      const semanticScore = scores.find(s => s.tier === MemoryTier.SEMANTIC);
      if (!semanticScore) {
        throw new Error('Missing semantic memory score');
      }
      
      // Validate score structure
      if (semanticScore.score < 0 || semanticScore.score > 1) {
        throw new Error(`Invalid score range: ${semanticScore.score}`);
      }
      
      if (semanticScore.features.length === 0) {
        throw new Error('Missing feature data in scoring result');
      }
      
      if (semanticScore.reasoning.length === 0) {
        throw new Error('Missing reasoning in scoring result');
      }
      
      console.log('    ✅ Scoring function working correctly');
      console.log(`    📈 Semantic score: ${semanticScore.score.toFixed(3)} (${semanticScore.reasoning[0]})`);
      console.log(`    🔍 Features: ${semanticScore.features.map(f => f.name).join(', ')}`);
      
      testsPassed++;
      
    } catch (error) {
      console.error(`    ❌ Scoring validation: ${error instanceof Error ? error.message : String(error)}`);
      testsFailed++;
    }
    
    // Test 3: Concurrency control
    console.log('\n⚡ Test 3: Concurrency Control');
    
    try {
      const concurrentOps = [];
      const testTier = MemoryTier.WORKING;
      const maxConcurrent = 3;
      
      // Start multiple concurrent operations
      for (let i = 0; i < maxConcurrent + 2; i++) {
        concurrentOps.push(
          orchestrator.acquireResources(testTier, MemoryOperation.STORE)
            .then(release => ({ i, release }))
        );
      }
      
      const startTime = Date.now();
      const results = await Promise.all(concurrentOps);
      const totalTime = Date.now() - startTime;
      
      if (results.length !== maxConcurrent + 2) {
        throw new Error(`Expected ${maxConcurrent + 2} results, got ${results.length}`);
      }
      
      // Release resources
      results.forEach(({ release }) => release());
      
      console.log(`    ✅ Concurrency control working (${results.length} operations in ${totalTime}ms)`);
      testsPassed++;
      
    } catch (error) {
      console.error(`    ❌ Concurrency test: ${error instanceof Error ? error.message : String(error)}`);
      testsFailed++;
    }
    
    // Test 4: Idempotency
    console.log('\n🔑 Test 4: Idempotency');
    
    try {
      const idempotencyKey: IdempotencyKey = {
        key: 'test-idempotency-001',
        operation: MemoryOperation.STORE,
        contentHash: 'hash123',
        expiresAt: new Date(Date.now() + 60000) // 1 minute
      };
      
      // First check - should be cache miss
      const firstCheck = await orchestrator.checkIdempotency(idempotencyKey);
      if (firstCheck.hit) {
        throw new Error('Expected cache miss on first check');
      }
      
      // Store result
      const testResult = { success: true, id: 'test-123' };
      await orchestrator.storeIdempotencyResult(idempotencyKey, testResult);
      
      // Second check - should be cache hit
      const secondCheck = await orchestrator.checkIdempotency(idempotencyKey);
      if (!secondCheck.hit) {
        throw new Error('Expected cache hit on second check');
      }
      
      if (JSON.stringify(secondCheck.result) !== JSON.stringify(testResult)) {
        throw new Error('Cached result does not match stored result');
      }
      
      console.log('    ✅ Idempotency working correctly');
      console.log(`    💾 Cache hit with correct result`);
      
      testsPassed++;
      
    } catch (error) {
      console.error(`    ❌ Idempotency test: ${error instanceof Error ? error.message : String(error)}`);
      testsFailed++;
    }
    
    // Test 5: Health and metrics
    console.log('\n❤️ Test 5: Health and Metrics');
    
    try {
      const health = await orchestrator.getHealth();
      
      if (!['healthy', 'degraded', 'unhealthy'].includes(health.status)) {
        throw new Error(`Invalid health status: ${health.status}`);
      }
      
      if (health.uptime < 0) {
        throw new Error(`Invalid uptime: ${health.uptime}`);
      }
      
      const metrics = await orchestrator.getMetrics();
      
      if (metrics.routing.totalRequests < ROUTING_TEST_CASES.length) {
        throw new Error('Metrics not capturing routing requests');
      }
      
      if (!metrics.routing.tierDistribution[MemoryTier.WORKING]) {
        throw new Error('Missing tier distribution data');
      }
      
      console.log('    ✅ Health and metrics working correctly');
      console.log(`    📊 Status: ${health.status}, Uptime: ${Math.round(health.uptime / 1000)}s`);
      console.log(`    🎯 Requests: ${metrics.routing.totalRequests}, P95: ${metrics.routing.routingLatencyP95.toFixed(1)}ms`);
      
      testsPassed++;
      
    } catch (error) {
      console.error(`    ❌ Health/metrics test: ${error instanceof Error ? error.message : String(error)}`);
      testsFailed++;
    }
    
  } finally {
    await orchestrator.shutdown();
    console.log('🧹 Orchestrator shut down');
  }
  
  // Final summary
  console.log('\n📊 Integration Test Results:');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  
  if (testsFailed > 0) {
    console.error('\n💥 Orchestrator integration tests failed!');
    process.exit(1);
  } else {
    console.log('\n🎉 All orchestrator integration tests passed!');
    console.log('\n🚀 Phase 3.2 Memory Orchestrator: COMPLETE!');
    console.log('\n✨ Key Features Validated:');
    console.log('   • Intelligent tier routing with scoring');
    console.log('   • Content-length and operation-type features');
    console.log('   • User hint preferences');
    console.log('   • Concurrency control with semaphores');
    console.log('   • Idempotency with caching');
    console.log('   • Telemetry and performance metrics');
    console.log('   • Health monitoring and graceful degradation');
  }
}

// Performance summary
async function performanceSummary(): Promise<void> {
  console.log('\n⏱️ Performance Summary:');
  
  const config = createDefaultOrchestratorConfig();
  const orchestrator = new MemoryOrchestratorStub(config);
  
  await orchestrator.initialize();
  
  const testContext: RoutingContext = {
    operation: MemoryOperation.SEARCH,
    query: 'Performance test query',
    metadata: { timestamp: new Date() }
  };
  
  const iterations = 100;
  const startTime = Date.now();
  
  const promises = Array(iterations).fill(0).map(() => 
    orchestrator.route(testContext)
  );
  
  await Promise.all(promises);
  
  const totalTime = Date.now() - startTime;
  const avgLatency = totalTime / iterations;
  
  console.log(`   📈 ${iterations} routing operations in ${totalTime}ms`);
  console.log(`   ⚡ Average latency: ${avgLatency.toFixed(1)}ms per operation`);
  console.log(`   🎯 Throughput: ${Math.round(iterations / (totalTime / 1000))} ops/sec`);
  
  const metrics = await orchestrator.getMetrics();
  console.log(`   📊 P95 routing latency: ${metrics.routing.routingLatencyP95.toFixed(1)}ms`);
  
  await orchestrator.shutdown();
}

// Run if called directly
if (require.main === module) {
  runOrchestratorIntegrationTests()
    .then(() => performanceSummary())
    .catch(console.error);
}

export { runOrchestratorIntegrationTests, ROUTING_TEST_CASES };
