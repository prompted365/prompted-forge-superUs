# RFC: Memory Interface Change Template

**Status**: Template  
**Author**: System  
**Date**: 2025-08-17

## Summary
**Template for documenting changes to memory system interfaces.**

Use this template when modifying `packages/memory/src/interfaces.ts` or any core interface contracts.

---

## Summary
What method/shape changes? Why now?

*Example: Adding `batchStore` method to IWorkingMemory for performance optimization*

## Interface Diff
- **Before**: 
```typescript
interface IWorkingMemory {
  store(entry: WorkingMemoryEntry): Promise<MemoryResult<string>>;
}
```

- **After**:
```typescript
interface IWorkingMemory {
  store(entry: WorkingMemoryEntry): Promise<MemoryResult<string>>;
  batchStore(entries: WorkingMemoryEntry[]): Promise<MemoryResult<string[]>>;
}
```

## Impact
- **Affected packages**: List packages that import this interface
- **Breaking changes**: Yes/No - describe what breaks
- **Migration steps**: 
  1. Update stub implementations
  2. Add smoke tests for new method
  3. Update factory patterns

## Tests
- **Added smoke tests**: List new test files or test cases
- **Updated existing tests**: List modified test files
- **Performance impact**: Expected latency/throughput changes

## Rollout Plan
1. **Phase 1**: Update interfaces and stubs (this PR)
2. **Phase 2**: Implement in full services (follow-up PR)
3. **Phase 3**: Enable via feature flags (production PR)

## Acceptance Criteria
- [ ] All memory tier stubs implement new interface methods
- [ ] Smoke tests pass for new functionality
- [ ] No breaking changes to existing API surface
- [ ] Documentation updated with new method signatures

---

**Rule**: Any PR touching `src/interfaces.ts` must include:
1. RFC file following this template
2. Updated smoke tests demonstrating new functionality
3. All affected stub implementations updated

**Approval required from**: Architecture review (audit-level scrutiny)
