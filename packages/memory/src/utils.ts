import { createHash } from 'crypto';
import winston from 'winston';

// Token counting utility (simplified for now, can be enhanced with tiktoken)
export class TokenCounter {
  private static readonly CHARS_PER_TOKEN = 4; // Rough estimate
  
  static count(text: string): number {
    if (typeof text !== 'string') {
      text = JSON.stringify(text);
    }
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }
  
  static countArray(items: any[]): number {
    return items.reduce((total, item) => total + this.count(item), 0);
  }
  
  static countObject(obj: Record<string, any>): number {
    return this.count(JSON.stringify(obj));
  }
}

// Compression utility
export class CompressionHelper {
  static async compress(data: any, strategy: string = 'json'): Promise<Buffer> {
    const jsonStr = JSON.stringify(data);
    
    switch (strategy) {
      case 'json':
        return Buffer.from(jsonStr, 'utf8');
      case 'gzip':
        // In a real implementation, use zlib.gzip
        return Buffer.from(jsonStr, 'utf8');
      default:
        return Buffer.from(jsonStr, 'utf8');
    }
  }
  
  static async decompress(buffer: Buffer, strategy: string = 'json'): Promise<any> {
    switch (strategy) {
      case 'json':
        return JSON.parse(buffer.toString('utf8'));
      case 'gzip':
        // In a real implementation, use zlib.gunzip
        return JSON.parse(buffer.toString('utf8'));
      default:
        return JSON.parse(buffer.toString('utf8'));
    }
  }
  
  static calculateRatio(originalSize: number, compressedSize: number): number {
    return originalSize > 0 ? compressedSize / originalSize : 1;
  }
}

// Clock utility for time-based operations
export class Clock {
  static now(): Date {
    return new Date();
  }
  
  static nowMs(): number {
    return Date.now();
  }
  
  static addSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * 1000);
  }
  
  static addMinutes(date: Date, minutes: number): Date {
    return this.addSeconds(date, minutes * 60);
  }
  
  static addHours(date: Date, hours: number): Date {
    return this.addMinutes(date, hours * 60);
  }
  
  static addDays(date: Date, days: number): Date {
    return this.addHours(date, days * 24);
  }
  
  static isExpired(date: Date): boolean {
    return date < this.now();
  }
  
  static durationMs(startTime: Date, endTime?: Date): number {
    const end = endTime || this.now();
    return end.getTime() - startTime.getTime();
  }
}

// Hashing utility
export class HashHelper {
  static sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
  
  static generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
  }
  
  static contentHash(content: any): string {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    return this.sha256(str).substr(0, 16); // Short hash for performance
  }
}

// Performance monitoring utility
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();
  
  static startTimer(operation: string): () => number {
    const startTime = Clock.nowMs();
    
    return () => {
      const duration = Clock.nowMs() - startTime;
      this.recordMetric(operation, duration);
      return duration;
    };
  }
  
  static recordMetric(operation: string, value: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const values = this.metrics.get(operation)!;
    values.push(value);
    
    // Keep only last 1000 measurements
    if (values.length > 1000) {
      values.shift();
    }
  }
  
  static getStats(operation: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const values = this.metrics.get(operation);
    if (!values || values.length === 0) {
      return null;
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count,
      average: sum / count,
      min: sorted[0],
      max: sorted[count - 1],
      p95: sorted[Math.floor(count * 0.95)],
    };
  }
  
  static getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const operation of this.metrics.keys()) {
      stats[operation] = this.getStats(operation);
    }
    return stats;
  }
}

// Configuration helper
export class ConfigHelper {
  static parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)(s|m|h|d)$/);
    if (!match) {
      throw new Error(`Invalid interval format: ${interval}`);
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error(`Unknown time unit: ${unit}`);
    }
  }
  
  static parseSize(size: string): number {
    const match = size.match(/^(\d+)(B|KB|MB|GB)$/i);
    if (!match) {
      throw new Error(`Invalid size format: ${size}`);
    }
    
    const value = parseInt(match[1]);
    const unit = match[2].toUpperCase();
    
    switch (unit) {
      case 'B': return value;
      case 'KB': return value * 1024;
      case 'MB': return value * 1024 * 1024;
      case 'GB': return value * 1024 * 1024 * 1024;
      default: throw new Error(`Unknown size unit: ${unit}`);
    }
  }
}

// Logger factory
export const createMemoryLogger = (component: string): winston.Logger => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { 
      service: 'memory',
      component,
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
};
