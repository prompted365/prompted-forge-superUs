# Database Integration Design - Phase 3.4

## 🎯 Objective
Design and implement database backing for memory persistence following Homeskillet Rhythm™ surgical upgrade methodology.

## 🏗️ Design → Stub → Verify → Evolve

### Design Phase ✅
This document defines the logical data model, interfaces, and migration strategy.

## 📊 Logical Data Model

### Core Entities

#### Memory Objects
```sql
CREATE TABLE memory_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('WORKING', 'EPISODIC', 'SEMANTIC', 'SHARED')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  context_analysis JSONB DEFAULT '{}', -- Phase 3.3 context engine results
  policy_decisions JSONB DEFAULT '{}', -- Phase 3.3 policy framework results
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retention_until TIMESTAMP WITH TIME ZONE,
  compressed BOOLEAN DEFAULT FALSE,
  compression_metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_memory_objects_tier ON memory_objects(tier);
CREATE INDEX idx_memory_objects_created_at ON memory_objects(created_at);
CREATE INDEX idx_memory_objects_retention ON memory_objects(retention_until) WHERE retention_until IS NOT NULL;
CREATE INDEX idx_memory_objects_metadata_gin ON memory_objects USING GIN(metadata);
CREATE INDEX idx_memory_objects_context_gin ON memory_objects USING GIN(context_analysis);
```

#### Memory Relationships (for Semantic Memory)
```sql
CREATE TABLE memory_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES memory_objects(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES memory_objects(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.50 CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_id, target_id, relationship_type)
);

CREATE INDEX idx_memory_relationships_source ON memory_relationships(source_id);
CREATE INDEX idx_memory_relationships_target ON memory_relationships(target_id);
```

#### Policy Audit Log
```sql
CREATE TABLE policy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID REFERENCES memory_objects(id) ON DELETE SET NULL,
  policy_type VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  rule_id VARCHAR(100) NOT NULL,
  decision JSONB NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trace_id VARCHAR(100),
  request_id VARCHAR(100)
);

CREATE INDEX idx_policy_audit_log_memory_id ON policy_audit_log(memory_id);
CREATE INDEX idx_policy_audit_log_applied_at ON policy_audit_log(applied_at);
CREATE INDEX idx_policy_audit_log_trace_id ON policy_audit_log(trace_id);
```

#### Context Analysis Cache
```sql
CREATE TABLE context_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 of content
  analysis_result JSONB NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  engine_version VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_context_cache_hash ON context_analysis_cache(content_hash);
CREATE INDEX idx_context_cache_expires ON context_analysis_cache(expires_at);
```

## 🔧 Interface Design

### Data Access Object (DAO) Pattern

```typescript
export interface MemoryObjectDAO {
  // Core operations
  create(obj: CreateMemoryObjectRequest): Promise<MemoryObject>;
  findById(id: string): Promise<MemoryObject | null>;
  findByTier(tier: MemoryTier, options?: QueryOptions): Promise<MemoryObject[]>;
  update(id: string, updates: UpdateMemoryObjectRequest): Promise<MemoryObject>;
  delete(id: string): Promise<void>;
  
  // Search operations
  search(query: SearchQuery): Promise<SearchResult>;
  findExpired(retentionUntil?: Date): Promise<MemoryObject[]>;
  
  // Analytics operations
  getStats(tier?: MemoryTier): Promise<MemoryStats>;
  getTierDistribution(): Promise<TierDistribution>;
}

export interface PolicyAuditDAO {
  log(entry: PolicyAuditEntry): Promise<void>;
  findByMemoryId(memoryId: string): Promise<PolicyAuditEntry[]>;
  findByTraceId(traceId: string): Promise<PolicyAuditEntry[]>;
}

export interface ContextCacheDAO {
  get(contentHash: string): Promise<CachedContextAnalysis | null>;
  set(contentHash: string, analysis: ContextAnalysis, ttlSeconds: number): Promise<void>;
  cleanup(): Promise<number>; // Returns count of cleaned entries
}
```

### Repository Pattern

```typescript
export interface MemoryRepository {
  // Aggregate operations combining DAO calls
  storeWithContext(
    content: string,
    tier: MemoryTier,
    context?: ContextAnalysis,
    policies?: PolicyEvaluationResult
  ): Promise<MemoryObject>;
  
  retrieveWithAudit(id: string, requestContext: RequestContext): Promise<MemoryObject | null>;
  
  searchWithAnalytics(
    query: SearchQuery,
    requestContext: RequestContext
  ): Promise<SearchResultWithAnalytics>;
}
```

## 🚦 Feature Flag Strategy

### `PF_DATABASE_ENABLED`
- **Default**: `false` (uses in-memory stubs)
- **When `true`**: Uses PostgreSQL + Redis backing
- **Fallback**: Graceful degradation to memory-based implementations

### Configuration
```bash
# Database Integration (disabled by default)
PF_DATABASE_ENABLED=false
PF_DATABASE_URL=postgresql://user:pass@localhost:5432/prompted_forge
PF_REDIS_URL=redis://localhost:6379
PF_DATABASE_POOL_SIZE=10
PF_DATABASE_TIMEOUT_MS=5000

# Migration settings
PF_DATABASE_AUTO_MIGRATE=false
PF_DATABASE_MIGRATION_TIMEOUT_MS=30000
```

## 📦 Migration Strategy

### Database Migrations
Using `node-pg-migrate` for schema management:

```javascript
// migrations/001-initial-schema.js
exports.up = (pgm) => {
  // Create memory_objects table
  pgm.createTable('memory_objects', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tier: { type: 'varchar(20)', notNull: true },
    content: { type: 'text', notNull: true },
    // ... rest of schema
  });
  
  // Create indexes
  pgm.createIndex('memory_objects', 'tier');
  // ... rest of indexes
};

exports.down = (pgm) => {
  pgm.dropTable('memory_objects', { cascade: true });
};
```

### Deployment Strategy
1. **Phase 1**: Deploy with `PF_DATABASE_ENABLED=false` (stub mode)
2. **Phase 2**: Run migrations in staging environment
3. **Phase 3**: Enable database for non-critical operations
4. **Phase 4**: Full database backing with monitoring

## 🔍 Implementation Phases

### Phase 1: Stub Implementation ✅ (Current)
- In-memory implementations for all DAOs
- Feature flag infrastructure
- Interface definitions

### Phase 2: Database Connection & Migrations
- PostgreSQL connection pool
- Migration runner
- Health checks for database connectivity

### Phase 3: Core DAO Implementation
- Real PostgreSQL implementations
- Redis caching for frequently accessed data
- Error handling and connection recovery

### Phase 4: Repository & Integration
- Repository pattern implementation
- Integration with existing orchestrator
- Performance optimization and query tuning

### Phase 5: Production Hardening
- Connection pooling optimization
- Monitoring and alerting
- Backup and recovery procedures

## 📈 Performance Targets

### Database Operations
- **Create**: <50ms p95
- **Read**: <10ms p95
- **Search**: <100ms p95 (simple queries)
- **Update**: <25ms p95

### Cache Performance
- **Context Cache Hit**: <1ms p95
- **Context Cache Miss**: <5ms p95
- **Cache Cleanup**: <100ms for 1000 entries

### Connection Management
- **Pool Acquisition**: <5ms p95
- **Health Check**: <10ms p95
- **Migration**: <30s total (all migrations)

## 🛡️ Security Considerations

### Data Protection
- **Encryption at Rest**: PostgreSQL TDE or disk encryption
- **Encryption in Transit**: SSL/TLS for all connections
- **PII Handling**: Integration with Phase 3.3 policy framework

### Access Control
- **Database User**: Limited privileges, read/write only to specific tables
- **Connection Pooling**: Secure credential management
- **Audit Trail**: All operations logged through policy audit system

### Compliance
- **Data Retention**: Automatic cleanup based on retention policies
- **Data Portability**: Export capabilities for data migration
- **Audit Requirements**: Complete audit trail in policy_audit_log

## 🔧 Testing Strategy

### Unit Tests
- DAO implementations with test database
- Repository pattern logic
- Migration scripts

### Integration Tests
- End-to-end database operations
- Feature flag switching (stub ↔ database)
- Error scenarios and recovery

### Performance Tests
- Load testing with realistic workloads
- Connection pool saturation testing
- Cache effectiveness measurement

### Migration Tests
- Forward and backward migration testing
- Data integrity validation
- Schema validation

## 📋 Definition of Done

### Stub Phase ✅
- [ ] Interface definitions complete
- [ ] In-memory stub implementations
- [ ] Feature flag infrastructure
- [ ] Basic unit tests

### Database Phase
- [ ] PostgreSQL connection and pooling
- [ ] Migration system operational
- [ ] Health checks implemented
- [ ] Core DAO implementations

### Integration Phase
- [ ] Repository pattern implemented
- [ ] Orchestrator integration complete
- [ ] Performance targets met
- [ ] All tests passing

### Production Phase
- [ ] Security hardening complete
- [ ] Monitoring and alerting configured
- [ ] Documentation updated
- [ ] Deployment procedures validated

---

*Built with Homeskillet Rhythm™ - Design complete, ready for Stub implementation*
