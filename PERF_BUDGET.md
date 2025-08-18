# Performance Budget - Phase 3.4.3 Deployment Pipeline

## Overview
This document establishes performance targets and budgets for the Prompted Forge MCP deployment pipeline, following the Homeskillet Rhythm™ approach of measurable, incremental improvements.

## Build Performance Targets

### Docker Build Time
- **Target**: Build completes in < 2 minutes on GitHub Actions (ubuntu-latest)
- **Warning Threshold**: > 90 seconds 
- **Failure Threshold**: > 180 seconds
- **Current Baseline**: TBD (to be established after first CI run)

### Docker Image Size
- **Target**: Final runtime image < 150MB
- **Warning Threshold**: > 120MB
- **Failure Threshold**: > 200MB
- **Baseline**: TBD (Alpine Node 20 + app dependencies)

### Helm Operations
- **Chart Lint**: < 5 seconds
- **Template Rendering**: < 10 seconds per environment
- **Chart Package**: < 3 seconds

## Runtime Performance Targets

### Health Endpoints
- **Liveness Probe** (`/healthz`):
  - Response time: < 100ms P95
  - Memory overhead: < 1MB
  - CPU overhead: < 1m (1 millicore)

- **Readiness Probe** (`/healthz?readiness=1`):
  - Response time: < 200ms P95 (includes DB checks)
  - Maximum probe failures before restart: 3
  - Probe interval: 5-10 seconds

### Metrics Endpoint (Development Only)
- **Metrics Collection** (`/metrics`):
  - Response time: < 50ms P95
  - Scrape size: < 1KB (basic metrics)
  - Memory overhead: < 5MB for Prometheus client

## Kubernetes Resource Budgets

### Development Environment
```yaml
resources:
  requests:
    cpu: 50m
    memory: 64Mi
  limits:
    cpu: 200m
    memory: 256Mi
```

### Staging Environment
```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

### Production Environment
```yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

## Application Startup Targets

### Container Boot Time
- **Target**: Application ready in < 10 seconds
- **Components**:
  - Observability initialization: < 2 seconds
  - Database stub initialization: < 1 second
  - Enhanced orchestrator setup: < 3 seconds
  - HTTP server bind: < 1 second
  - Readiness probe success: < 3 seconds

### Feature Flag Impact
- **Baseline** (PF_ORCH_ENABLED only): Boot in < 5 seconds
- **Enhanced** (all features enabled): Boot in < 10 seconds
- **Memory overhead per feature**: < 50MB

## Deployment Pipeline SLAs

### CI/CD Performance
- **Total pipeline runtime**: < 5 minutes
- **Docker build + push**: < 3 minutes (multi-arch)
- **Helm validation**: < 30 seconds
- **Artifact upload**: < 30 seconds

### Rollout Performance
- **Rolling update**: Zero downtime (maxUnavailable: 0)
- **Pod replacement time**: < 30 seconds
- **Traffic switch time**: < 5 seconds
- **Health check stabilization**: < 15 seconds

## Monitoring and Alerting

### Performance Regression Detection
- **Image size growth**: Alert if > 10% increase between versions
- **Build time regression**: Alert if > 25% increase
- **Boot time regression**: Alert if readiness probe takes > 15 seconds

### Production Thresholds
- **CPU usage**: Alert if sustained > 70% of requests
- **Memory usage**: Alert if sustained > 80% of limits  
- **Response times**: Alert if P95 > 500ms for health checks

## Budget Evolution

### Phase 3.4.3 (Current)
- Focus: Establish baseline measurements
- Method: Warning-only alerts (no failures)
- Review: After 1 week of main branch builds

### Phase 3.4.4 (Future)
- Focus: Implement hard limits
- Method: CI failures for budget violations
- Optimization: Reduce image size by 20%

### Phase 4.0
- Focus: Production performance optimization
- Method: Real-time monitoring and auto-scaling
- Target: < 100ms P95 response times under load

## Implementation Notes

### Budget Enforcement
1. **Warning Phase** (Phase 3.4.3): Log warnings, continue build
2. **Enforcement Phase** (Phase 3.4.4): Fail builds exceeding hard limits
3. **Optimization Phase** (Phase 4.0): Automatic performance tuning

### Measurement Tools
- Docker build time: GitHub Actions timing
- Image size: `docker image inspect --format='{{.Size}}'`
- Runtime metrics: Prometheus + Grafana dashboards
- Health endpoint timing: Built-in application logging

### Update Schedule
This document should be reviewed and updated:
- After each major phase completion
- When performance targets are consistently exceeded
- When new features are added that impact performance
- Monthly during active development

---

**Last Updated**: Phase 3.4.3 kickoff  
**Next Review**: After first production deployment  
**Owner**: Prompted Forge DevOps Team
