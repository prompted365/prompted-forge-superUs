#!/usr/bin/env npx ts-node

/**
 * Enhanced Memory System Smoke Test
 * 
 * Tests feature flags, error handling, telemetry, and basic functionality
 */

import { 
  MemorySystemFactory, 
  createDefaultMemoryConfig,
  MemoryTelemetry,
  ConsoleTelemetryEmitter,
  MemoryErrorFactory,
  MemoryTier,
  ErrorCode
} from '../src/index';

async function runEnhancedSmokeTest() {
  console.log('🧪 Enhanced Memory System Smoke Test');
  console.log('=====================================\n');

  try {
    // 1. Test feature flags
    console.log('1️⃣  Testing Feature Flags');
    console.log(`   Current environment flags:
   - PF_MEMORY_IMPL: ${process.env.PF_MEMORY_IMPL || 'not set'}
   - PF_MEMORY_IMPL_WORKING: ${process.env.PF_MEMORY_IMPL_WORKING || 'not set'}
   - PF_MEMORY_IMPL_EPISODIC: ${process.env.PF_MEMORY_IMPL_EPISODIC || 'not set'}
   - PF_MEMORY_IMPL_SEMANTIC: ${process.env.PF_MEMORY_IMPL_SEMANTIC || 'not set'}
   - PF_MEMORY_IMPL_SHARED: ${process.env.PF_MEMORY_IMPL_SHARED || 'not set'}`);

    // 2. Test telemetry setup
    console.log('\n2️⃣  Setting up telemetry');
    const telemetry = new MemoryTelemetry(
      new ConsoleTelemetryEmitter(),
      {
        traceId: 'smoke-test-trace-' + Date.now(),
        sessionId: 'smoke-test-session'
      }
    );

    // 3. Test error system
    console.log('\n3️⃣  Testing error system');
    const testError = MemoryErrorFactory.operationTimeout('test-operation', 5000, {
      operation: 'smoke-test',
      tier: 'test'
    });
    
    console.log(`   Created error: ${testError.toString()}`);
    console.log(`   Error code: ${testError.code}`);
    console.log(`   Retryable: ${testError.retryable}`);
    console.log(`   Severity: ${testError.severity}`);
    
    // Log the error to telemetry
    telemetry.errorOccurred(testError);

    // 4. Test memory system creation
    console.log('\n4️⃣  Creating memory system');
    telemetry.operationStart('memory-system-creation');
    
    const startTime = Date.now();
    const config = createDefaultMemoryConfig();
    const factory = new MemorySystemFactory(config);
    const duration = Date.now() - startTime;
    
    telemetry.operationSuccess('memory-system-creation', duration);
    console.log(`   Factory created in ${duration}ms`);

    // 5. Test memory tier creation
    console.log('\n5️⃣  Testing memory tier creation');
    
    const tiers = ['working', 'episodic', 'semantic', 'shared'] as const;
    const results: Record<string, any> = {};
    
    for (const tierName of tiers) {
      try {
        const tierStartTime = Date.now();
        telemetry.operationStart(`create-${tierName}-memory`);
        
        let memory;
        switch (tierName) {
          case 'working':
            memory = await factory.createWorkingMemory();
            break;
          case 'episodic':
            memory = await factory.createEpisodicMemory();
            break;
          case 'semantic':
            memory = await factory.createSemanticMemory();
            break;
          case 'shared':
            memory = await factory.createSharedMemory();
            break;
        }
        
        const tierDuration = Date.now() - tierStartTime;
        telemetry.operationSuccess(`create-${tierName}-memory`, tierDuration);
        
        // Test health check
        const isHealthy = await memory.isHealthy();
        const tier = tierName.toUpperCase() as MemoryTier;
        telemetry.healthCheck(tier, isHealthy);
        
        results[tierName] = {
          created: true,
          healthy: isHealthy,
          duration: tierDuration
        };
        
        console.log(`   ✅ ${tierName.charAt(0).toUpperCase() + tierName.slice(1)} Memory: healthy=${isHealthy} (${tierDuration}ms)`);
        
      } catch (error) {
        telemetry.operationFailure(`create-${tierName}-memory`, error as Error);
        results[tierName] = {
          created: false,
          error: (error as Error).message
        };
        console.log(`   ❌ ${tierName.charAt(0).toUpperCase() + tierName.slice(1)} Memory: failed - ${(error as Error).message}`);
      }
    }

    // 6. Test batch operations
    console.log('\n6️⃣  Testing batch operations');
    try {
      telemetry.operationStart('batch-creation');
      const batchStartTime = Date.now();
      
      const allMemories = await factory.createAll();
      const batchDuration = Date.now() - batchStartTime;
      
      telemetry.operationSuccess('batch-creation', batchDuration, undefined, {
        itemCount: Object.keys(allMemories).length
      });
      
      console.log(`   ✅ Batch creation: ${Object.keys(allMemories).length} tiers in ${batchDuration}ms`);
      
      // Test health check for all
      const healthChecks = await Promise.all([
        allMemories.working.isHealthy(),
        allMemories.episodic.isHealthy(),
        allMemories.semantic.isHealthy(),
        allMemories.shared.isHealthy()
      ]);
      
      const allHealthy = healthChecks.every(h => h);
      console.log(`   ✅ All memory tiers healthy: ${allHealthy}`);
      
    } catch (error) {
      telemetry.operationFailure('batch-creation', error as Error);
      console.log(`   ❌ Batch creation failed: ${(error as Error).message}`);
    }

    // 7. Summary
    console.log('\n📊 Test Summary');
    console.log('================');
    
    const totalTiers = tiers.length;
    const successfulTiers = Object.values(results).filter(r => r.created).length;
    const successRate = (successfulTiers / totalTiers) * 100;
    
    console.log(`   Total tiers tested: ${totalTiers}`);
    console.log(`   Successful creations: ${successfulTiers}`);
    console.log(`   Success rate: ${successRate.toFixed(1)}%`);
    
    // Final telemetry event
    telemetry.operationSuccess('smoke-test-complete', Date.now(), undefined, {
      itemCount: totalTiers
    });
    
    if (successRate === 100) {
      console.log('\n✅ All tests passed! Memory system is operational.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Check implementation.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Smoke test failed with error:', error);
    process.exit(1);
  }
}

// Test with different feature flag configurations
async function testFeatureFlagConfiguration() {
  console.log('\n🚩 Testing Feature Flag Configurations');
  console.log('======================================\n');
  
  const testConfigs = [
    { name: 'All Stubs (default)', env: {} },
    { name: 'Global Full', env: { PF_MEMORY_IMPL: 'full' } },
    { name: 'Working Full Only', env: { PF_MEMORY_IMPL_WORKING: 'full' } },
  ];
  
  for (const testConfig of testConfigs) {
    console.log(`Testing: ${testConfig.name}`);
    
    // Set environment variables
    for (const [key, value] of Object.entries(testConfig.env)) {
      process.env[key] = value;
    }
    
    try {
      const config = createDefaultMemoryConfig();
      const factory = new MemorySystemFactory(config);
      const working = await factory.createWorkingMemory();
      const healthy = await working.isHealthy();
      
      console.log(`   ✅ Working memory: healthy=${healthy}`);
    } catch (error) {
      console.log(`   ⚠️  Working memory: ${(error as Error).message}`);
    }
    
    // Clean up environment variables
    for (const key of Object.keys(testConfig.env)) {
      delete process.env[key];
    }
  }
}

// Main execution
if (require.main === module) {
  (async () => {
    await runEnhancedSmokeTest();
    await testFeatureFlagConfiguration();
  })();
}
