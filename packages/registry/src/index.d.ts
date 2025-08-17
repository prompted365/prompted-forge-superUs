import winston from 'winston';
import { CapabilityRegistryManager } from './capability-registry/registry';
import { DomainMapper } from './domain-mapping/domain-mapper';
export * from './types';
export { CapabilityRegistryManager } from './capability-registry/registry';
export { DomainMapper } from './domain-mapping/domain-mapper';
export type { FieldMapping, EntityMapping, WorkflowStepMapping, DomainMapping, } from './domain-mapping/domain-mapper';
export declare const createLogger: (serviceName: string) => winston.Logger;
export declare const createRegistryManager: () => CapabilityRegistryManager;
export declare const createDomainMapper: () => DomainMapper;
//# sourceMappingURL=index.d.ts.map