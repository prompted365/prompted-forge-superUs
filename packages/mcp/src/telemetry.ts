/**
 * Telemetry and Logging Utilities
 * 
 * Simple logging setup for MCP package components
 */

import winston from 'winston';

// Default logger configuration
export const logger = winston.createLogger({
  level: process.env.PF_LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'mcp-package',
    version: '3.3.0' 
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// Silence logger in test environments
if (process.env.NODE_ENV === 'test') {
  logger.level = 'error';
}
