# Credential Outage & Rotation Runbook — RoozyLabs Prism

**Document Version:** v2.7.0  
**Verification Status:** `VERIFIED`  

---

## Credential State Definitions

Prism credentials progress through 6 state machine statuses:
- **`HEALTHY`**: Active, healthy score (>=80), unexpired, zero cooldown.
- **`DEGRADED`**: Active, score (<80), minor error encounters.
- **`COOLDOWN`**: Rate limited (`429`) or quarantined (`50x`), temporarily excluded.
- **`EXHAUSTED`**: Quota limit reached (`rate_limited`), excluded.
- **`DISABLED`**: Explicitly disabled by operator (`enabled = false`).
- **`INVALID`**: Returned `401 Unauthorized` or `403 Forbidden` invalid key error.

---

## Emergency Credential Rotation Procedure

If a provider API key (`sk-proj-...`) is compromised or invalidated:

### 1. Disable Compromised Credential
```sql
UPDATE credentials SET enabled = false, status = 'invalid' WHERE id = 'cred_compromised_123';
```

### 2. Insert Replacement Credential via Admin API / CLI
Encrypt raw API key using AES-256-GCM (`utils.EncryptAES256GCM`) and insert into database:

```bash
# Add replacement credential via Admin API
curl -X POST https://api.prism.roozylabs.com/api/v1/credentials \
  -H "Authorization: Bearer <ADMIN_SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "prov_openai",
    "name": "OpenAI Primary Key - Replacement",
    "apiKey": "sk-proj-NEW_STRONG_API_KEY_HERE",
    "priority": 1,
    "enabled": true
  }'
```

### 3. Clear Cooldowns in Redis
```bash
# Clear any cooldowns for provider credentials
docker compose exec redis redis-cli -a redis KEYS "credential:*:cooldown" | xargs -r docker compose exec redis redis-cli -a redis DEL
```
