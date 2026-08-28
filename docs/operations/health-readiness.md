# Health Check & Readiness Probe Runbook — RoozyLabs Prism

**Document Version:** v2.7.0  
**Verification Status:** `VERIFIED`  

---

## Liveness vs Readiness Definitions

Prism exposes distinct endpoints to differentiate process liveness from traffic readiness:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Liveness Probe (/health)                                               │
│ • Checks: Process alive, HTTP looper responsive                         │
│ • Usage: Kubernetes / Docker container restarts when failing           │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ Readiness Probe (/ready)                                               │
│ • Checks: PostgreSQL connection active (PingContext)                   │
│ • Checks: Redis connection active (Ping)                               │
│ • Usage: Load Balancer / Nginx routing traffic ONLY when HTTP 200 OK   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Endpoint Specifications

### 1. `/health` & `/ready` Response Schema

```bash
curl -i http://localhost:8080/health
```

#### Healthy Response (HTTP 200 OK)
```json
{
  "status": "ok",
  "version": "2.1.0",
  "database": "ok",
  "redis": "ok"
}
```

#### Degraded Response (HTTP 503 Service Unavailable)
If PostgreSQL or Redis is unreachable:
```json
{
  "status": "degraded",
  "version": "2.1.0",
  "database": "error",
  "redis": "ok"
}
```

---

## Dependency Failure Behavior Matrix

| Unreachable Dependency | `/health` / `/ready` Status | HTTP Code | Gateway Traffic Behavior | Recovery Action |
|------------------------|-----------------------------|-----------|--------------------------|-----------------|
| **PostgreSQL Down** | `status: "degraded"` | `503` | Rejects new requests with 503 Service Unavailable. | Restart Postgres container or fix network. |
| **Redis Down** | `status: "degraded"` | `503` | Degrades rate limiting to local in-memory fallback. | Restart Redis container. |
| **Provider API Down** | `status: "ok"` | `200` | Gateway is healthy; router bypasses failing provider via fallback. | Managed by Circuit Breaker & Cooldown. |
