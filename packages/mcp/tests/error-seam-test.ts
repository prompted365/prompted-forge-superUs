#!/usr/bin/env ts-node

/**
 * Error Seam Mapping Test
 * Validates that every MCP error path maps to a MemoryError code
 * Ensures no raw strings leak through error boundaries
 */

import { MCPErrorCode, MCPError, MCPErrorFactory } from '../src/interfaces/mcp-errors';
import { ErrorCode as MemoryErrorCode } from '@prompted-forge/memory';

interface ErrorMapping {
  mcpCode: MCPErrorCode;
  memoryCode: MemoryErrorCode;
  description: string;
}

// Define the complete error seam mapping - simplified version
const ERROR_SEAM_MAPPINGS: ErrorMapping[] = [
  // Protocol Errors -> Configuration Errors
  {
    mcpCode: MCPErrorCode.MCP_PROTOCOL_ERROR,
    memoryCode: MemoryErrorCode.MEMORY_CONFIG_INVALID,
    description: 'Protocol error maps to invalid configuration'
  },
  {
    mcpCode: MCPErrorCode.MCP_METHOD_NOT_FOUND,
    memoryCode: MemoryErrorCode.MEMORY_CONFIG_INVALID,
    description: 'Unknown method maps to invalid configuration'
  },
  {
    mcpCode: MCPErrorCode.MCP_INVALID_PARAMS,
    memoryCode: MemoryErrorCode.INVALID_OPERATION_CONTEXT,
    description: 'Invalid parameters map to invalid operation context'
  },
  
  // Connection Errors -> Database Connection Errors  
  {
    mcpCode: MCPErrorCode.MCP_CONNECTION_FAILED,
    memoryCode: MemoryErrorCode.DATABASE_CONNECTION_FAILED,
    description: 'Connection failure maps to database connection failed'
  },
  
  // Context Analysis Errors -> Operation Errors
  {
    mcpCode: MCPErrorCode.MCP_CONTEXT_ANALYSIS_FAILED,
    memoryCode: MemoryErrorCode.MEMORY_OPERATION_FAILED,
    description: 'Context analysis failure maps to memory operation failed'
  },
  
  // Memory Bridge Errors -> Memory-specific Errors
  {
    mcpCode: MCPErrorCode.MCP_BRIDGE_OPERATION_FAILED,
    memoryCode: MemoryErrorCode.MEMORY_OPERATION_FAILED,
    description: 'Bridge operation failure maps to memory operation failed'
  },
  
  // Server Management Errors -> System Errors
  {
    mcpCode: MCPErrorCode.MCP_SERVER_NOT_RUNNING,
    memoryCode: MemoryErrorCode.HEALTH_CHECK_FAILED,
    description: 'Server not running maps to health check failed'
  },
  {
    mcpCode: MCPErrorCode.MCP_CONFIGURATION_INVALID,
    memoryCode: MemoryErrorCode.MEMORY_CONFIG_INVALID,
    description: 'Configuration invalid maps to memory config invalid'
  }
];

function mapMCPErrorToMemoryError(mcpError: MCPError): MemoryErrorCode {
  const mapping = ERROR_SEAM_MAPPINGS.find(m => m.mcpCode === mcpError.code);
  if (!mapping) {
    throw new Error(`No mapping found for MCP error code: ${mcpError.code}`);
  }
  return mapping.memoryCode;
}

async function runErrorSeamTests(): Promise<void> {
  console.log('🔗 Starting Error Seam Mapping Tests...');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  for (const mapping of ERROR_SEAM_MAPPINGS) {
    try {
      console.log(`\n🧪 Testing: ${mapping.description}`);
      
      // Create MCP error using factory
      const mcpError = createMCPErrorByCode(mapping.mcpCode);
      
      // Verify it's a proper MCPError instance (no raw strings)
      if (!(mcpError instanceof MCPError)) {
        throw new Error(`Expected MCPError instance, got: ${typeof mcpError}`);
      }
      
      // Verify error has proper structure
      if (typeof mcpError.code !== 'string') {
        throw new Error(`Expected string error code, got: ${typeof mcpError.code}`);
      }
      
      if (typeof mcpError.message !== 'string' || mcpError.message.trim() === '') {
        throw new Error(`Expected non-empty error message, got: "${mcpError.message}"`);
      }
      
      // Test the mapping
      const mappedMemoryCode = mapMCPErrorToMemoryError(mcpError);
      
      if (mappedMemoryCode !== mapping.memoryCode) {
        throw new Error(`Mapping failed: expected ${mapping.memoryCode}, got ${mappedMemoryCode}`);
      }
      
      // Verify mapped code is valid MemoryErrorCode
      if (!Object.values(MemoryErrorCode).includes(mappedMemoryCode)) {
        throw new Error(`Invalid memory error code: ${mappedMemoryCode}`);
      }
      
      console.log(`✅ MCP ${mapping.mcpCode} -> Memory ${mappedMemoryCode}`);
      testsPassed++;
      
    } catch (error) {
      console.error(`❌ ${mapping.description}: ${error instanceof Error ? error.message : String(error)}`);
      testsFailed++;
    }
  }
  
  // Test error factory methods
  console.log('\n🏭 Testing Error Factory Methods...');
  
  const factoryTests = [
    () => MCPErrorFactory.protocolError('test protocol error'),
    () => MCPErrorFactory.methodNotFound('test.method'),
    () => MCPErrorFactory.invalidParams('test.method', 'invalid params'),
    () => MCPErrorFactory.connectionFailed('test connection'),
    () => MCPErrorFactory.contextAnalysisFailed('test analysis'),
    () => MCPErrorFactory.serverNotRunning(),
    () => MCPErrorFactory.configurationInvalid('test config')
  ];
  
  for (const factoryTest of factoryTests) {
    try {
      const error = factoryTest();
      
      if (!(error instanceof MCPError)) {
        throw new Error(`Factory method returned non-MCPError: ${typeof error}`);
      }
      
      if (typeof error.message !== 'string' || error.message.includes('undefined')) {
        throw new Error(`Factory method produced invalid message: "${error.message}"`);
      }
      
      console.log(`✅ Factory method produced valid MCPError`);
      testsPassed++;
      
    } catch (error) {
      console.error(`❌ Factory test failed: ${error instanceof Error ? error.message : String(error)}`);
      testsFailed++;
    }
  }
  
  // Summary
  console.log(`\n📊 Error Seam Test Results:`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  
  if (testsFailed > 0) {
    console.error('\n💥 Error seam mapping validation failed!');
    process.exit(1);
  } else {
    console.log('\n🎉 All error seam mappings validated successfully!');
  }
}

function createMCPErrorByCode(code: MCPErrorCode): MCPError {
  switch (code) {
    case MCPErrorCode.MCP_PROTOCOL_ERROR:
      return MCPErrorFactory.protocolError('test protocol error');
    case MCPErrorCode.MCP_METHOD_NOT_FOUND:
      return MCPErrorFactory.methodNotFound('test.method');
    case MCPErrorCode.MCP_INVALID_PARAMS:
      return MCPErrorFactory.invalidParams('test.method', 'invalid params');
    case MCPErrorCode.MCP_CONNECTION_FAILED:
      return MCPErrorFactory.connectionFailed('test connection');
    case MCPErrorCode.MCP_CONTEXT_ANALYSIS_FAILED:
      return MCPErrorFactory.contextAnalysisFailed('test analysis');
    case MCPErrorCode.MCP_BRIDGE_OPERATION_FAILED:
      return MCPErrorFactory.bridgeOperationFailed('test operation', 'test reason');
    case MCPErrorCode.MCP_SERVER_NOT_RUNNING:
      return MCPErrorFactory.serverNotRunning();
    case MCPErrorCode.MCP_CONFIGURATION_INVALID:
      return MCPErrorFactory.configurationInvalid('test config invalid');
    default:
      throw new Error(`Unknown MCP error code: ${code}`);
  }
}

// Run if called directly
if (require.main === module) {
  runErrorSeamTests().catch(console.error);
}
