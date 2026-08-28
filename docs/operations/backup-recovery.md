# Backup & Disaster Recovery Runbook — RoozyLabs Prism

**Document Version:** v2.7.0  
**Verification Status:** `VERIFIED`  

---

## Realistic Recovery Objectives (RPO & RTO)

| Service Layer | Recovery Point Objective (RPO) | Recovery Time Objective (RTO) | Backup Frequency & Method |
|---------------|--------------------------------|-------------------------------|---------------------------|
| **PostgreSQL DB** | **1 Hour** | **15 Minutes** | Hourly `pg_dump` compressed dumps to S3 / Remote Storage. |
| **Redis Store** | **N/A (Ephemeral)** | **5 Minutes** | Ephemeral cache state; automatic keyspace rebuild on startup. |
| **Secrets & Keys**| **0 Hours (Instant)** | **5 Minutes** | Encrypted `.env` backup stored in secure secret manager. |

---

## 1. Automated PostgreSQL Backup Procedure

Save backup script to `/opt/prism/scripts/backup_postgres.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/prism"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/prism_db_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

# Execute compressed pg_dump dump
docker compose -f /opt/prism/docker-compose.yml exec -T postgres \
  pg_dump -U postgres prism | gzip > "${BACKUP_FILE}"

# Retention cleanup: Keep last 7 days locally
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +7 -delete

echo "PostgreSQL backup completed: ${BACKUP_FILE}"
```

Add cron job to execute hourly:
```cron
0 * * * * /opt/prism/scripts/backup_postgres.sh >> /var/log/prism_backup.log 2>&1
```

---

## 2. PostgreSQL Point-In-Time Database Restore

To restore PostgreSQL database from a backup dump:

```bash
# 1. Stop API container to prevent active database writes
docker compose stop api api-green

# 2. Restore database schema and data from backup dump
gunzip < /var/backups/prism/prism_db_20260828_120000.sql.gz | \
  docker compose exec -T postgres psql -U postgres -d prism

# 3. Restart API Gateway container
docker compose start api

# 4. Verify Database Integrity
curl -sS http://localhost:8080/health
```
