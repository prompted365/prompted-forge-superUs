// Memory Package Main Export

// Core interfaces and types
export * from './interfaces';
export * from './utils';
export * from './factory';
export * from './errors';
export * from './telemetry';

// Export stub implementations
export { WorkingMemoryStub } from './working/working-memory-stub';
export { EpisodicMemoryStub } from './episodic/episodic-memory-stub';
export { SemanticMemoryStub } from './semantic/semantic-memory-stub';
export { SharedMemoryStub } from './shared/shared-memory-stub';
export { BaseMemoryStub } from './base/base-memory-stub';

// Package metadata
export const VERSION = '0.1.0';
export const PACKAGE_NAME = '@prompted-forge/memory';
