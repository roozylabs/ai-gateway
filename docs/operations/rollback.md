# Safe Rollback Runbook — RoozyLabs Prism

**Document Version:** v2.7.0  
**Verification Status:** `VERIFIED`  

---

## Rollback Procedures

This document provides step-by-step instructions for rolling back software updates, Docker containers, environment configurations, and database migrations.

---

## 1. Application & Docker Container Rollback

To roll back `prism-api`, `prism-app`, or `prism-web` containers to a previous stable image tag:

```bash
# 1. Update image tag in docker-compose.yml to target version (e.g. v2.6.0)
sed -i 's/prism-api:latest/prism-api:v2.6.0/g' docker-compose.yml

# 2. Redeploy container image
docker compose up -d api app web

# 3. Verify Health Check
curl -sS http://localhost:8080/health
```

---

## 2. Git Commit Rollback

To revert software commit on production VPS:

```bash
cd /opt/prism
git fetch origin
git checkout v2.6.0 # or specific stable commit SHA
docker compose build api app web
docker compose up -d
```

---

## 3. Database Migration Rollback Considerations

> [!CAUTION]
> **Schema Migration Rollback Rules**: Only roll back migrations if the newer schema version causes severe runtime failure. Verify no irreversible DDL data loss will occur.

```bash
# Roll back 1 migration step down
migrate -path apps/api/migrations -database "postgres://postgres:postgres@localhost:5433/prism?sslmode=disable" down 1
```

If schema rollback is not possible due to destructive changes, restore PostgreSQL from pre-deployment backup dump as detailed in [backup-recovery.md](./backup-recovery.md).
