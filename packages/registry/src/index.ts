// Registry Package Main Export
import winston from 'winston';

// Core types
export * from './types';

// Registry manager
export { CapabilityRegistryManager } from './capability-registry/registry';

// Domain mapping
export { DomainMapper } from './domain-mapping/domain-mapper';
export type {
  FieldMapping,
  EntityMapping,
  WorkflowStepMapping,
  DomainMapping,
} from './domain-mapping/domain-mapper';

// Default logger configuration
export const createLogger = (serviceName: string): winston.Logger => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ],
  });
};

// Registry factory
export const createRegistryManager = (): CapabilityRegistryManager => {
  const logger = createLogger('registry');
  return new CapabilityRegistryManager(logger);
};

// Domain mapper factory
export const createDomainMapper = (): DomainMapper => {
  const logger = createLogger('domain-mapper');
  return new DomainMapper(logger);
};
