# Memory Tier Feature Flags

This document describes the feature flags available for controlling memory tier implementations in the Prompted Forge system.

## Overview

Feature flags allow you to switch between stub and full implementations of memory tiers without code changes. This enables:
- Safe development and testing with stubs
- Gradual rollout of full implementations
- Quick fallback to stubs if issues arise
- Environment-specific configurations

## Environment Variables

### Global Flag
- `PF_MEMORY_IMPL`: Sets the default implementation for all memory tiers
  - Values: `stub` (default), `full`

### Tier-Specific Flags (override global)
- `PF_MEMORY_IMPL_WORKING`: Working Memory implementation
- `PF_MEMORY_IMPL_EPISODIC`: Episodic Memory implementation  
- `PF_MEMORY_IMPL_SEMANTIC`: Semantic Memory implementation
- `PF_MEMORY_IMPL_SHARED`: Shared Memory implementation

## Usage Examples

### Development (all stubs)
```bash
# Default behavior - no env vars needed
npm run dev
```

### Testing with mixed implementations
```bash
# Use full working memory, stubs for others
PF_MEMORY_IMPL_WORKING=full npm run test

# Use full for all except shared memory
PF_MEMORY_IMPL=full PF_MEMORY_IMPL_SHARED=stub npm run integration-test
```

### Production
```bash
# All full implementations
PF_MEMORY_IMPL=full npm start
```

## Behavior

1. **Precedence**: Tier-specific flags override the global flag
2. **Fallback**: If a full implementation isn't available, the system automatically falls back to stubs with a warning
3. **Logging**: Factory logs show which implementation is being used
4. **Default**: All tiers default to `stub` if no flags are set

## Implementation Status

| Tier | Stub | Full | Notes |
|------|------|------|-------|
| Working | ✅ | 🚧 | Stub ready, full in development |
| Episodic | ✅ | ⏳ | Stub ready, full planned |
| Semantic | ✅ | ⏳ | Stub ready, full planned |
| Shared | ✅ | ⏳ | Stub ready, full planned |

## Adding New Implementations

When adding a full implementation:

1. Create the implementation class in the appropriate tier directory
2. Update the factory to import and instantiate it when `impl === 'full'`
3. Remove the fallback warning
4. Update this documentation

Example factory pattern:
```typescript
async create(): Promise<IWorkingMemory> {
  const impl = process.env.PF_MEMORY_IMPL_WORKING ?? process.env.PF_MEMORY_IMPL ?? 'stub';
  const policy = this.getPolicy('working');
  
  if (impl === 'full') {
    const { WorkingMemoryService } = await import('./working/working-memory-service');
    return new WorkingMemoryService(config, policy, this.logger);
  }
  
  const { WorkingMemoryStub } = await import('./working/working-memory-stub');
  return new WorkingMemoryStub(config, policy, this.logger);
}
```
