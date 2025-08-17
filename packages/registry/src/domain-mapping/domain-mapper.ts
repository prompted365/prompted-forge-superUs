import { winston } from 'winston';
import { z } from 'zod';

// Domain Mapping Types
export const FieldMappingSchema = z.object({
  sourceField: z.string(),
  targetField: z.string(),
  transform: z.string().optional(),
  validation: z.string().optional(),
});

export const EntityMappingSchema = z.object({
  sourceType: z.string(),
  targetType: z.string(),
  fieldMappings: z.array(FieldMappingSchema),
  relationships: z.array(z.string()).optional(),
});

export const WorkflowStepMappingSchema = z.object({
  sourceStep: z.string(),
  targetStep: z.string(),
  parameters: z.record(z.any()).optional(),
});

export const DomainMappingSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.enum(['fhir', 'medplum', 'custom']),
  target: z.string(),
  entityMappings: z.record(EntityMappingSchema),
  workflowMappings: z.record(z.array(WorkflowStepMappingSchema)),
  metadata: z.record(z.any()).optional(),
});

export type FieldMapping = z.infer<typeof FieldMappingSchema>;
export type EntityMapping = z.infer<typeof EntityMappingSchema>;
export type WorkflowStepMapping = z.infer<typeof WorkflowStepMappingSchema>;
export type DomainMapping = z.infer<typeof DomainMappingSchema>;

export class DomainMapper {
  private mappings: Map<string, DomainMapping>;
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.mappings = new Map();
    this.initializeBuiltinMappings();
  }

  private initializeBuiltinMappings() {
    // Healthcare to Business Domain Mapping
    const healthcareToBusiness: DomainMapping = {
      id: 'healthcare-to-business',
      name: 'Healthcare to General Business',
      source: 'fhir',
      target: 'general-business',
      entityMappings: {
        Patient: {
          sourceType: 'Patient',
          targetType: 'Customer',
          fieldMappings: [
            { sourceField: 'name', targetField: 'customerName' },
            { sourceField: 'identifier', targetField: 'customerId' },
            { sourceField: 'active', targetField: 'isActive' },
            { sourceField: 'birthDate', targetField: 'dateOfBirth' },
            { sourceField: 'telecom', targetField: 'contactInfo' },
            { sourceField: 'address', targetField: 'address' },
          ],
          relationships: ['Organization', 'Practitioner']
        },
        Practitioner: {
          sourceType: 'Practitioner',
          targetType: 'Employee',
          fieldMappings: [
            { sourceField: 'name', targetField: 'employeeName' },
            { sourceField: 'identifier', targetField: 'employeeId' },
            { sourceField: 'active', targetField: 'isActive' },
            { sourceField: 'qualification', targetField: 'skills' },
            { sourceField: 'telecom', targetField: 'contactInfo' },
          ],
          relationships: ['Organization']
        },
        Organization: {
          sourceType: 'Organization',
          targetType: 'Department',
          fieldMappings: [
            { sourceField: 'name', targetField: 'departmentName' },
            { sourceField: 'identifier', targetField: 'departmentId' },
            { sourceField: 'active', targetField: 'isActive' },
            { sourceField: 'type', targetField: 'departmentType' },
            { sourceField: 'telecom', targetField: 'contactInfo' },
            { sourceField: 'address', targetField: 'location' },
          ]
        },
        Appointment: {
          sourceType: 'Appointment',
          targetType: 'Meeting',
          fieldMappings: [
            { sourceField: 'status', targetField: 'status' },
            { sourceField: 'start', targetField: 'startTime' },
            { sourceField: 'end', targetField: 'endTime' },
            { sourceField: 'participant', targetField: 'attendees' },
            { sourceField: 'description', targetField: 'agenda' },
          ]
        },
        Task: {
          sourceType: 'Task',
          targetType: 'WorkItem',
          fieldMappings: [
            { sourceField: 'status', targetField: 'status' },
            { sourceField: 'intent', targetField: 'priority' },
            { sourceField: 'description', targetField: 'description' },
            { sourceField: 'owner', targetField: 'assignee' },
            { sourceField: 'executionPeriod', targetField: 'timeline' },
          ]
        }
      },
      workflowMappings: {
        'patient-onboarding': [
          { sourceStep: 'registration', targetStep: 'customer-registration' },
          { sourceStep: 'verification', targetStep: 'identity-verification' },
          { sourceStep: 'assessment', targetStep: 'needs-assessment' },
          { sourceStep: 'care-plan', targetStep: 'service-plan' },
        ],
        'appointment-scheduling': [
          { sourceStep: 'availability-check', targetStep: 'resource-availability' },
          { sourceStep: 'booking', targetStep: 'reservation' },
          { sourceStep: 'confirmation', targetStep: 'confirmation' },
          { sourceStep: 'reminder', targetStep: 'notification' },
        ]
      }
    };

    this.mappings.set('healthcare-to-business', healthcareToBusiness);
    this.logger.info('Initialized builtin domain mappings');
  }

  async registerMapping(mapping: DomainMapping): Promise<void> {
    // Validate mapping schema
    const validated = DomainMappingSchema.parse(mapping);
    
    this.mappings.set(mapping.id, validated);
    this.logger.info(`Registered domain mapping: ${mapping.id}`);
  }

  async getMapping(mappingId: string): Promise<DomainMapping | undefined> {
    return this.mappings.get(mappingId);
  }

  async transformEntity(
    mappingId: string,
    sourceEntityType: string,
    sourceData: any
  ): Promise<any> {
    const mapping = this.mappings.get(mappingId);
    if (!mapping) {
      throw new Error(`Domain mapping not found: ${mappingId}`);
    }

    const entityMapping = mapping.entityMappings[sourceEntityType];
    if (!entityMapping) {
      throw new Error(`Entity mapping not found: ${sourceEntityType}`);
    }

    const transformed: any = {
      _sourceType: sourceEntityType,
      _targetType: entityMapping.targetType,
      _mappingId: mappingId,
    };

    // Apply field mappings
    for (const fieldMapping of entityMapping.fieldMappings) {
      const sourceValue = this.getNestedValue(sourceData, fieldMapping.sourceField);
      
      if (sourceValue !== undefined) {
        let transformedValue = sourceValue;
        
        // Apply transformation if specified
        if (fieldMapping.transform) {
          transformedValue = this.applyTransform(transformedValue, fieldMapping.transform);
        }
        
        // Apply validation if specified
        if (fieldMapping.validation) {
          this.validateField(transformedValue, fieldMapping.validation);
        }
        
        this.setNestedValue(transformed, fieldMapping.targetField, transformedValue);
      }
    }

    this.logger.debug('Entity transformed', {
      mappingId,
      sourceType: sourceEntityType,
      targetType: entityMapping.targetType,
    });

    return transformed;
  }

  async transformWorkflow(
    mappingId: string,
    workflowName: string,
    sourceSteps: any[]
  ): Promise<any[]> {
    const mapping = this.mappings.get(mappingId);
    if (!mapping) {
      throw new Error(`Domain mapping not found: ${mappingId}`);
    }

    const workflowMapping = mapping.workflowMappings[workflowName];
    if (!workflowMapping) {
      throw new Error(`Workflow mapping not found: ${workflowName}`);
    }

    const transformedSteps = [];

    for (const sourceStep of sourceSteps) {
      const stepMapping = workflowMapping.find(wm => wm.sourceStep === sourceStep.name);
      
      if (stepMapping) {
        const transformedStep = {
          ...sourceStep,
          name: stepMapping.targetStep,
          _originalName: sourceStep.name,
          parameters: {
            ...sourceStep.parameters,
            ...stepMapping.parameters,
          }
        };
        
        transformedSteps.push(transformedStep);
      } else {
        // Keep unmapped steps as-is with warning
        this.logger.warn(`Unmapped workflow step: ${sourceStep.name}`, {
          mappingId,
          workflowName
        });
        transformedSteps.push(sourceStep);
      }
    }

    return transformedSteps;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private applyTransform(value: any, transform: string): any {
    // Simple transform implementations
    switch (transform) {
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'boolean':
        return Boolean(value);
      case 'number':
        return Number(value);
      case 'date':
        return new Date(value);
      default:
        return value;
    }
  }

  private validateField(value: any, validation: string): void {
    // Simple validation implementations
    const validations = validation.split('|');
    
    for (const rule of validations) {
      const [validator, param] = rule.split(':');
      
      switch (validator) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            throw new Error(`Field is required`);
          }
          break;
        case 'minLength':
          if (typeof value === 'string' && value.length < parseInt(param)) {
            throw new Error(`Field must be at least ${param} characters`);
          }
          break;
        case 'maxLength':
          if (typeof value === 'string' && value.length > parseInt(param)) {
            throw new Error(`Field must be no more than ${param} characters`);
          }
          break;
        case 'email':
          if (typeof value === 'string' && !/\S+@\S+\.\S+/.test(value)) {
            throw new Error('Field must be a valid email address');
          }
          break;
      }
    }
  }

  listMappings(): string[] {
    return Array.from(this.mappings.keys());
  }

  async deleteMapping(mappingId: string): Promise<boolean> {
    const deleted = this.mappings.delete(mappingId);
    if (deleted) {
      this.logger.info(`Deleted domain mapping: ${mappingId}`);
    }
    return deleted;
  }
}
