"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDomainMapper = exports.createRegistryManager = exports.createLogger = exports.DomainMapper = exports.CapabilityRegistryManager = void 0;
// Registry Package Main Export
const winston_1 = __importDefault(require("winston"));
const registry_1 = require("./capability-registry/registry");
const domain_mapper_1 = require("./domain-mapping/domain-mapper");
// Core types
__exportStar(require("./types"), exports);
// Registry manager
var registry_2 = require("./capability-registry/registry");
Object.defineProperty(exports, "CapabilityRegistryManager", { enumerable: true, get: function () { return registry_2.CapabilityRegistryManager; } });
// Domain mapping
var domain_mapper_2 = require("./domain-mapping/domain-mapper");
Object.defineProperty(exports, "DomainMapper", { enumerable: true, get: function () { return domain_mapper_2.DomainMapper; } });
// Default logger configuration
const createLogger = (serviceName) => {
    return winston_1.default.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
        defaultMeta: { service: serviceName },
        transports: [
            new winston_1.default.transports.Console({
                format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
            })
        ],
    });
};
exports.createLogger = createLogger;
// Registry factory
const createRegistryManager = () => {
    const logger = (0, exports.createLogger)('registry');
    return new registry_1.CapabilityRegistryManager(logger);
};
exports.createRegistryManager = createRegistryManager;
// Domain mapper factory
const createDomainMapper = () => {
    const logger = (0, exports.createLogger)('domain-mapper');
    return new domain_mapper_1.DomainMapper(logger);
};
exports.createDomainMapper = createDomainMapper;
//# sourceMappingURL=index.js.map