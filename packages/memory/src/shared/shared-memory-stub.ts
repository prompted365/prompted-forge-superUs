import winston from 'winston';
import { 
  ISharedMemory,
  MemoryTier,
  MemoryPolicyConfig,
  MemoryResult,
  SharedResource,
  ResourceAudience,
  SubscriptionInterest
} from '../interfaces';
import { BaseMemoryStub } from '../base/base-memory-stub';

export class SharedMemoryStub extends BaseMemoryStub implements ISharedMemory {
  private resources = new Map<string, SharedResource>();
  private subscriptions = new Map<string, {
    resourcePattern: string;
    subscriberId: string;
    interests: SubscriptionInterest[];
  }>();
  
  constructor(
    private postgresConfig: any,
    private redisConfig: any,
    policy: MemoryPolicyConfig,
    logger: winston.Logger
  ) {
    super(MemoryTier.SHARED, policy, logger, 'Shared Memory');
  }

  // Resource operations
  async publishResource(resourceData: SharedResource, audience: ResourceAudience): Promise<MemoryResult<string>> {
    const id = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const resource: SharedResource = {
      ...resourceData,
      id,
      audience,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.resources.set(id, resource);
    
    // Notify subscribers
    await this.notifySubscribers(id, 'created', resource);
    
    return {
      success: true,
      data: id,
      metadata: {
        tier: this.tier,
        operationType: 'publishResource',
        latencyMs: 20,
      }
    };
  }

  async getResource(resourceId: string, requesterId: string): Promise<MemoryResult<SharedResource>> {
    const resource = this.resources.get(resourceId);
    
    if (!resource) {
      return {
        success: false,
        error: 'Resource not found',
        metadata: { tier: this.tier, operationType: 'getResource', latencyMs: 5 }
      };
    }
    
    // Check access (simplified)
    const hasAccess = await this.checkAccess(resourceId, requesterId);
    if (!hasAccess.success || !hasAccess.data) {
      return {
        success: false,
        error: 'Access denied',
        metadata: { tier: this.tier, operationType: 'getResource', latencyMs: 10 }
      };
    }
    
    return {
      success: true,
      data: resource,
      metadata: { tier: this.tier, operationType: 'getResource', latencyMs: 15 }
    };
  }

  async updateResource(resourceId: string, updates: Partial<SharedResource>): Promise<MemoryResult> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return {
        success: false,
        error: 'Resource not found',
        metadata: { tier: this.tier, operationType: 'updateResource', latencyMs: 5 }
      };
    }
    
    const updated = { ...resource, ...updates, updatedAt: new Date() };
    this.resources.set(resourceId, updated);
    
    // Notify subscribers
    await this.notifySubscribers(resourceId, 'updated', updated);
    
    return {
      success: true,
      data: updated,
      metadata: { tier: this.tier, operationType: 'updateResource', latencyMs: 15 }
    };
  }

  async deleteResource(resourceId: string): Promise<MemoryResult> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return {
        success: false,
        error: 'Resource not found',
        metadata: { tier: this.tier, operationType: 'deleteResource', latencyMs: 5 }
      };
    }
    
    this.resources.delete(resourceId);
    
    // Notify subscribers
    await this.notifySubscribers(resourceId, 'deleted', { id: resourceId });
    
    return {
      success: true,
      metadata: { tier: this.tier, operationType: 'deleteResource', latencyMs: 10 }
    };
  }

  // Subscription operations
  async subscribe(resourcePattern: string, subscriberId: string, interests: SubscriptionInterest[]): Promise<MemoryResult<string>> {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.subscriptions.set(id, {
      resourcePattern,
      subscriberId,
      interests,
    });
    
    return {
      success: true,
      data: id,
      metadata: { tier: this.tier, operationType: 'subscribe', latencyMs: 8 }
    };
  }

  async unsubscribe(subscriptionId: string): Promise<MemoryResult> {
    const deleted = this.subscriptions.delete(subscriptionId);
    
    return {
      success: deleted,
      error: deleted ? undefined : 'Subscription not found',
      metadata: { tier: this.tier, operationType: 'unsubscribe', latencyMs: 5 }
    };
  }

  // Access control
  async checkAccess(resourceId: string, requesterId: string): Promise<MemoryResult<boolean>> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return {
        success: false,
        data: false,
        error: 'Resource not found',
        metadata: { tier: this.tier, operationType: 'checkAccess', latencyMs: 5 }
      };
    }
    
    // Simple access check - public resources are accessible to all
    // More complex logic would check audience scope and identifiers
    const hasAccess = resource.audience.scope === 'public' || 
                      resource.createdBy === requesterId ||
                      resource.audience.identifiers.includes(requesterId);
    
    return {
      success: true,
      data: hasAccess,
      metadata: { tier: this.tier, operationType: 'checkAccess', latencyMs: 8 }
    };
  }

  async updateAudience(resourceId: string, audience: ResourceAudience): Promise<MemoryResult> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return {
        success: false,
        error: 'Resource not found',
        metadata: { tier: this.tier, operationType: 'updateAudience', latencyMs: 5 }
      };
    }
    
    resource.audience = audience;
    resource.updatedAt = new Date();
    
    return {
      success: true,
      data: resource,
      metadata: { tier: this.tier, operationType: 'updateAudience', latencyMs: 10 }
    };
  }

  // Notification
  async notifySubscribers(resourceId: string, changeType: string, data?: any): Promise<MemoryResult> {
    let notified = 0;
    
    for (const [subscriptionId, subscription] of this.subscriptions) {
      // Simple pattern matching - in reality would use more sophisticated matching
      const matches = resourceId.includes(subscription.resourcePattern) || 
                      subscription.resourcePattern === '*';
      
      if (matches) {
        // Check if subscription is interested in this change type
        const isInterested = subscription.interests.some(interest => 
          interest.changeType === changeType || changeType === 'content-update'
        );
        
        if (isInterested) {
          // In a real implementation, this would send notifications
          // For now, just count the notifications
          notified++;
          this.logger.debug(`Notified subscriber ${subscription.subscriberId} about ${changeType} on ${resourceId}`);
        }
      }
    }
    
    return {
      success: true,
      data: { notified },
      metadata: { tier: this.tier, operationType: 'notifySubscribers', latencyMs: notified * 2 }
    };
  }
}
