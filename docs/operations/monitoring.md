# Monitoring, Metrics & Alerting Runbook — RoozyLabs Prism

**Document Version:** v2.7.0  
**Verification Status:** `VERIFIED`  

---

## Metric Catalog & Prometheus Integration

Prism exposes OpenTelemetry & Prometheus metrics on HTTP port `8080` at endpoint `/metrics`.

### Critical Production Signals

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Gateway Health & Throughput                                         │
│ • prism_requests_total (Counter)                                       │
│ • prism_request_errors_total (Counter)                                 │
│ • prism_request_duration_seconds (Histogram p50/p95/p99)              │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ 2. Upstream Provider Resilience                                        │
│ • prism_provider_requests_total (Counter)                              │
│ • prism_provider_errors_total (Counter)                                │
│ • prism_provider_retries_total (Counter)                               │
│ • prism_credential_health_score (Gauge 0-100)                         │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ 3. Admission, Governance & Financial Caps                              │
│ • prism_admission_denied_total (Counter)                               │
│ • prism_budget_exceeded_total (Counter)                                │
│ • prism_cost_usd_total (Counter)                                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Actionable Production Alert Rules

| Alert Rule Name | Metric Condition | Severity | Action / Runbook Link |
|-----------------|------------------|----------|-----------------------|
| **HighGatewayErrorRate** | Error rate > 5% over 5 minutes | **P1 (Critical)** | Check [health-readiness.md](./health-readiness.md) & [provider-outage.md](./provider-outage.md). |
| **PostgresUnreachable** | `prism_health_status{database="error"}` | **P1 (Critical)** | Execute [disaster-recovery.md](./disaster-recovery.md). |
| **RedisUnreachable** | `prism_health_status{redis="error"}` | **P2 (High)** | Execute [redis-recovery.md](./redis-recovery.md). |
| **CredentialQuarantined** | `prism_credential_health_score < 50` | **P2 (High)** | Execute [credential-outage.md](./credential-outage.md). |
| **BudgetCapExceeded** | `increase(prism_budget_exceeded_total[15m]) > 10` | **P3 (Warning)** | Notify Account Admin to adjust budget cap. |

---

## Log Querying Syntax (Loki / JSON Logs)

Query JSON logs by correlation ID:
```bash
# Filter all logs for a specific request_id
grep '"request_id":"req-12345"' /var/log/prism/gateway.log

# Filter all error events
grep '"level":"ERROR"' /var/log/prism/gateway.log
```
