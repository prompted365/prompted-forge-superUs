import winston from 'winston';
import { z } from 'zod';
export declare const FieldMappingSchema: z.ZodObject<{
    sourceField: z.ZodString;
    targetField: z.ZodString;
    transform: z.ZodOptional<z.ZodString>;
    validation: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sourceField: string;
    targetField: string;
    validation?: string | undefined;
    transform?: string | undefined;
}, {
    sourceField: string;
    targetField: string;
    validation?: string | undefined;
    transform?: string | undefined;
}>;
export declare const EntityMappingSchema: z.ZodObject<{
    sourceType: z.ZodString;
    targetType: z.ZodString;
    fieldMappings: z.ZodArray<z.ZodObject<{
        sourceField: z.ZodString;
        targetField: z.ZodString;
        transform: z.ZodOptional<z.ZodString>;
        validation: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sourceField: string;
        targetField: string;
        validation?: string | undefined;
        transform?: string | undefined;
    }, {
        sourceField: string;
        targetField: string;
        validation?: string | undefined;
        transform?: string | undefined;
    }>, "many">;
    relationships: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    sourceType: string;
    targetType: string;
    fieldMappings: {
        sourceField: string;
        targetField: string;
        validation?: string | undefined;
        transform?: string | undefined;
    }[];
    relationships?: string[] | undefined;
}, {
    sourceType: string;
    targetType: string;
    fieldMappings: {
        sourceField: string;
        targetField: string;
        validation?: string | undefined;
        transform?: string | undefined;
    }[];
    relationships?: string[] | undefined;
}>;
export declare const WorkflowStepMappingSchema: z.ZodObject<{
    sourceStep: z.ZodString;
    targetStep: z.ZodString;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    sourceStep: string;
    targetStep: string;
    parameters?: Record<string, any> | undefined;
}, {
    sourceStep: string;
    targetStep: string;
    parameters?: Record<string, any> | undefined;
}>;
export declare const DomainMappingSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    source: z.ZodEnum<["fhir", "medplum", "custom"]>;
    target: z.ZodString;
    entityMappings: z.ZodRecord<z.ZodString, z.ZodObject<{
        sourceType: z.ZodString;
        targetType: z.ZodString;
        fieldMappings: z.ZodArray<z.ZodObject<{
            sourceField: z.ZodString;
            targetField: z.ZodString;
            transform: z.ZodOptional<z.ZodString>;
            validation: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            sourceField: string;
            targetField: string;
            validation?: string | undefined;
            transform?: string | undefined;
        }, {
            sourceField: string;
            targetField: string;
            validation?: string | undefined;
            transform?: string | undefined;
        }>, "many">;
        relationships: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        sourceType: string;
        targetType: string;
        fieldMappings: {
            sourceField: string;
            targetField: string;
            validation?: string | undefined;
            transform?: string | undefined;
        }[];
        relationships?: string[] | undefined;
    }, {
        sourceType: string;
        targetType: string;
        fieldMappings: {
            sourceField: string;
            targetField: string;
            validation?: string | undefined;
            transform?: string | undefined;
        }[];
        relationships?: string[] | undefined;
    }>>;
    workflowMappings: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
        sourceStep: z.ZodString;
        targetStep: z.ZodString;
        parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        sourceStep: string;
        targetStep: string;
        parameters?: Record<string, any> | undefined;
    }, {
        sourceStep: string;
        targetStep: string;
        parameters?: Record<string, any> | undefined;
    }>, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    source: "custom" | "fhir" | "medplum";
    target: string;
    entityMappings: Record<string, {
        sourceType: string;
        targetType: string;
        fieldMappings: {
            sourceField: string;
            targetField: string;
            validation?: string | undefined;
            transform?: string | undefined;
        }[];
        relationships?: string[] | undefined;
    }>;
    workflowMappings: Record<string, {
        sourceStep: string;
        targetStep: string;
        parameters?: Record<string, any> | undefined;
    }[]>;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    name: string;
    source: "custom" | "fhir" | "medplum";
    target: string;
    entityMappings: Record<string, {
        sourceType: string;
        targetType: string;
        fieldMappings: {
            sourceField: string;
            targetField: string;
            validation?: string | undefined;
            transform?: string | undefined;
        }[];
        relationships?: string[] | undefined;
    }>;
    workflowMappings: Record<string, {
        sourceStep: string;
        targetStep: string;
        parameters?: Record<string, any> | undefined;
    }[]>;
    metadata?: Record<string, any> | undefined;
}>;
export type FieldMapping = z.infer<typeof FieldMappingSchema>;
export type EntityMapping = z.infer<typeof EntityMappingSchema>;
export type WorkflowStepMapping = z.infer<typeof WorkflowStepMappingSchema>;
export type DomainMapping = z.infer<typeof DomainMappingSchema>;
export declare class DomainMapper {
    private mappings;
    private logger;
    constructor(logger: winston.Logger);
    private initializeBuiltinMappings;
    registerMapping(mapping: DomainMapping): Promise<void>;
    getMapping(mappingId: string): Promise<DomainMapping | undefined>;
    transformEntity(mappingId: string, sourceEntityType: string, sourceData: any): Promise<any>;
    transformWorkflow(mappingId: string, workflowName: string, sourceSteps: any[]): Promise<any[]>;
    private getNestedValue;
    private setNestedValue;
    private applyTransform;
    private validateField;
    listMappings(): string[];
    deleteMapping(mappingId: string): Promise<boolean>;
}
//# sourceMappingURL=domain-mapper.d.ts.map