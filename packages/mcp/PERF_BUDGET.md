# Performance Budget - MCP Package

## Latency Targets

### MCP Protocol Overhead
- **P50**: < 5ms per request
- **P95**: < 15ms per request  
- **P99**: < 50ms per request

### Memory Operation Round-trip (MCP → Memory → MCP)
- **P50**: < 25ms for simple operations (store/retrieve)
- **P95**: < 100ms for simple operations
- **P99**: < 250ms for simple operations

### Context Analysis
- **P50**: < 50ms for basic entity extraction
- **P95**: < 200ms for complex context analysis
- **P99**: < 500ms for complex context analysis

### Memory Bridge Orchestration  
- **P50**: < 10ms for tier routing decisions
- **P95**: < 50ms for tier routing decisions
- **P99**: < 100ms for tier routing decisions

## Throughput Targets
- **Concurrent connections**: Support 100+ simultaneous MCP connections
- **Request rate**: Handle 1000+ requests/second per instance
- **Memory operations**: Process 500+ memory ops/second per tier

## Resource Constraints
- **Memory usage**: < 512MB per MCP server instance
- **CPU utilization**: < 70% under normal load
- **Connection pool**: Max 50 connections per memory tier

## Monitoring & Alerting
- Log performance metrics to telemetry system
- Alert on P95 > target + 50%
- Dashboard showing real-time latency distribution
- Circuit breaker triggers at P99 > 2x target

## Implementation Notes
- These are targets for Phase 3.2 - enforcement in CI comes later
- Current stub implementations will log metrics but not enforce limits  
- Real performance testing begins in Phase 3.3 with load testing suite
- Gradual rollout of enforcement: warn → fail-slow → fail-fast

## Benchmark Reference
Performance budget updated: 2025-08-17T09:03:00Z
Target environment: Mac M2, 16GB RAM, Node.js 22.x
