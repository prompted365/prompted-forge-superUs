"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainMapper = exports.DomainMappingSchema = exports.WorkflowStepMappingSchema = exports.EntityMappingSchema = exports.FieldMappingSchema = void 0;
const zod_1 = require("zod");
// Domain Mapping Types
exports.FieldMappingSchema = zod_1.z.object({
    sourceField: zod_1.z.string(),
    targetField: zod_1.z.string(),
    transform: zod_1.z.string().optional(),
    validation: zod_1.z.string().optional(),
});
exports.EntityMappingSchema = zod_1.z.object({
    sourceType: zod_1.z.string(),
    targetType: zod_1.z.string(),
    fieldMappings: zod_1.z.array(exports.FieldMappingSchema),
    relationships: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.WorkflowStepMappingSchema = zod_1.z.object({
    sourceStep: zod_1.z.string(),
    targetStep: zod_1.z.string(),
    parameters: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.DomainMappingSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    source: zod_1.z.enum(['fhir', 'medplum', 'custom']),
    target: zod_1.z.string(),
    entityMappings: zod_1.z.record(exports.EntityMappingSchema),
    workflowMappings: zod_1.z.record(zod_1.z.array(exports.WorkflowStepMappingSchema)),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
class DomainMapper {
    constructor(logger) {
        this.logger = logger;
        this.mappings = new Map();
        this.initializeBuiltinMappings();
    }
    initializeBuiltinMappings() {
        // Healthcare to Business Domain Mapping
        const healthcareToBusiness = {
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
    async registerMapping(mapping) {
        // Validate mapping schema
        const validated = exports.DomainMappingSchema.parse(mapping);
        this.mappings.set(mapping.id, validated);
        this.logger.info(`Registered domain mapping: ${mapping.id}`);
    }
    async getMapping(mappingId) {
        return this.mappings.get(mappingId);
    }
    async transformEntity(mappingId, sourceEntityType, sourceData) {
        const mapping = this.mappings.get(mappingId);
        if (!mapping) {
            throw new Error(`Domain mapping not found: ${mappingId}`);
        }
        const entityMapping = mapping.entityMappings[sourceEntityType];
        if (!entityMapping) {
            throw new Error(`Entity mapping not found: ${sourceEntityType}`);
        }
        const transformed = {
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
    async transformWorkflow(mappingId, workflowName, sourceSteps) {
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
            }
            else {
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
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!(key in current)) {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
    applyTransform(value, transform) {
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
    validateField(value, validation) {
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
    listMappings() {
        return Array.from(this.mappings.keys());
    }
    async deleteMapping(mappingId) {
        const deleted = this.mappings.delete(mappingId);
        if (deleted) {
            this.logger.info(`Deleted domain mapping: ${mappingId}`);
        }
        return deleted;
    }
}
exports.DomainMapper = DomainMapper;
//# sourceMappingURL=domain-mapper.js.map