import winston from 'winston';
import { 
  createRegistryManager,
  createDomainMapper,
  ModelTier,
  TenantScope,
} from '@prompted-forge/registry';
import { 
  createNexusClient,
  createMCPClientManager,
  BusinessContext,
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

async function main() {
  logger.info('🚀 Starting Prompted Forge Test Application');

  try {
    // Initialize components
    const registryManager = createRegistryManager();
    const domainMapper = createDomainMapper();
    const nexusClient = createNexusClient();
    const mcpClient = createMCPClientManager();

    logger.info('✅ Components initialized');

    // Test Nexus connectivity
    logger.info('🔍 Testing Nexus connectivity...');
    const isHealthy = await nexusClient.healthCheck();
    if (!isHealthy) {
      throw new Error('Nexus is not healthy');
    }
    logger.info('✅ Nexus is healthy');

    // List available models
    const models = await nexusClient.listModels();
    logger.info(`📋 Found ${models.length} models:`, {
      models: models.map((m: any) => m.id),
    });

    // Create a test tenant
    logger.info('👤 Creating test tenant...');
    const testTenantData: Omit<TenantScope, 'id'> = {
      name: 'Test Organization',
      tier: 'professional',
      samplingLimits: {
        maxTokensPerDay: 100000,
        maxCostPerMonth: 500,
        allowedModels: [ModelTier.STANDARD, ModelTier.PREMIUM],
        rateLimits: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000,
        },
      },
      allowedServers: ['nexus-llm', 'nexus-mcp'],
      allowedRoles: ['analyst', 'manager'],
      securityPolicies: ['standard-policy'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tenantId = await registryManager.createTenant(testTenantData);
    logger.info(`✅ Created tenant: ${tenantId}`);

    // Test domain mapping
    logger.info('🔄 Testing domain mapping...');
    const healthcarePatient = {
      name: [{ given: ['John'], family: 'Doe' }],
      identifier: [{ value: 'P123456' }],
      active: true,
      birthDate: '1980-01-01',
    };

    const businessCustomer = await domainMapper.transformEntity(
      'healthcare-to-business',
      'Patient',
      healthcarePatient
    );

    logger.info('✅ Domain mapping successful:', { businessCustomer });

    // Test LLM sampling
    logger.info('🤖 Testing LLM sampling...');
    const businessContext: BusinessContext = {
      domain: 'healthcare',
      priority: 'high',
      budget: { maxCost: 0.10, costPerToken: 0.00001 },
      compliance: {
        dataClassification: 'confidential',
        auditRequired: true,
      },
    };

    const sampleResult = await nexusClient.requestSampling(
      'Explain the benefits of AI in healthcare in 50 words.',
      businessContext,
      'test-agent-001'
    );

    logger.info('✅ LLM sampling successful:', {
      model: sampleResult.model,
      contentLength: sampleResult.content.length,
      tokens: sampleResult.usage?.totalTokens,
      latency: sampleResult.metadata.latencyMs,
    });

    // Test access validation
    logger.info('🔒 Testing access validation...');
    const accessResult = await registryManager.validateToolAccess({
      tenantId,
      roleId: 'analyst',
      serverId: 'nexus-llm',
      toolName: 'text-generation',
    });

    logger.info('✅ Access validation result:', { accessResult });

    // Registry statistics
    const stats = registryManager.getRegistryStats();
    logger.info('📊 Registry Statistics:', stats);

    logger.info('🎉 All tests completed successfully!');

  } catch (error) {
    logger.error('❌ Test failed:', { error });
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  logger.error('💥 Application crashed:', { error });
  process.exit(1);
});
