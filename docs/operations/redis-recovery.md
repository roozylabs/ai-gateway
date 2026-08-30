# Redis Recovery & Cache Loss Runbook — RoozyLabs Prism

**Document Version:** v2.7.0  
**Verification Status:** `VERIFIED`  

---

## Ephemeral Cache vs Durable Storage Distinction

Prism strictly separates **durable database data** from **ephemeral Redis state**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Durable Database Data (PostgreSQL 15)                                  │
│ • Users, Accounts, Memberships                                         │
│ • Gateway API Keys & Salted Hashes                                     │
│ • Provider Configurations & Encrypted Credentials                      │
│ • Models, Pricing Schemes, Routing Rules, Governance Policies          │
│ • Request Logs, AI Audit Trails, Tool Invocations                      │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ Ephemeral Cache & State (Redis 7)                                      │
│ • Credential Cooldown TTLs (`credential:<id>:cooldown`)                │
│ • 50x Server Error Counters (`credential:<id>:50x_count`)              │
│ • Active Streaming Hash Tracking (`gateway:active_requests`)           │
│ • Gateway Rate Limit Sliding Windows (`tenant:<org>:gateway:...`)      │
│ • Cached Gateway Key Hashes (TTL 60s)                                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Impact of Total Redis Cache Loss

If the Redis container crashes or suffers unrecoverable memory loss:
- **No Durable Data Lost**: Zero user, organization, API key, request log, or audit trail data is lost.
- **Cooldown Reset**: Cooling/quarantined credentials return to `active` state immediately until re-evaluated by upstream responses.
- **Rate Limit Window Reset**: Sliding rate limit counters reset to 0, allowing requests until window refills.
- **Active Streams Untracked**: Active SSE request count resets to 0 in dashboard telemetry.

---

## 2. Redis Recovery & Container Restart Procedure

If Redis becomes unreachable or corrupted:

```bash
# 1. Restart Redis Container
docker compose restart redis

# 2. Verify Redis Ping
docker compose exec redis redis-cli -a redis ping
# Expected output: PONG

# 3. Clear Stale Redis Keys if Necessary
docker compose exec redis redis-cli -a redis FLUSHDB

# 4. Check API Gateway Health Endpoint
curl -sS http://localhost:8080/health
# Expected: {"status":"ok","version":"2.2.0","database":"ok","redis":"ok"}
```
