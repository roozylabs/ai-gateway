# Database Migrations Runbook — RoozyLabs Prism

**Document Version:** v2.7.0  
**Verification Status:** `VERIFIED`  

---

## 1. Migration Execution Mechanism

Database migrations are managed sequentially using `golang-migrate` (`github.com/golang-migrate/migrate/v4`) located in `apps/api/migrations/` (migrations 001 through 070).

Upon application startup (`cmd/server/main.go`), `database.RunMigrations` executes pending `.up.sql` scripts automatically:

```go
if err := database.RunMigrations(cfg.DatabaseURL, "./migrations"); err != nil {
    log.Fatal("Failed to run migrations:", err)
}
```

---

## 2. Migration Execution Guidelines

### Schema Migration Rules
1. **Backward Compatibility**: Column additions must be nullable (`NULL`) or have default values (`DEFAULT`).
2. **Idempotency**: DDL statements MUST use `IF NOT EXISTS` or `DROP TABLE IF EXISTS` (e.g. `ALTER TABLE ai_audit_trails ADD COLUMN IF NOT EXISTS org_id VARCHAR(64);`).
3. **Transaction Safety**: Wrap multi-statement SQL migrations in transactional blocks where supported.

---

## 3. Manual Migration Commands & Reversibility Limitations

> [!CAUTION]
> **Reversibility Limitations**: Migrations containing data transformations or index drops are **NOT automatically reversible** without potential data loss. Always perform a `pg_dump` backup BEFORE executing manual schema migrations.

### Execute Migrations Manually
```bash
# Verify current schema version
docker compose exec postgres psql -U postgres -d prism -c "SELECT * FROM schema_migrations;"

# Execute migration up via migrate CLI
migrate -path apps/api/migrations -database "postgres://postgres:postgres@localhost:5433/prism?sslmode=disable" up
```

### Rollback Failed Migration
```bash
# Rollback single migration step down
migrate -path apps/api/migrations -database "postgres://postgres:postgres@localhost:5433/prism?sslmode=disable" down 1

# Force schema version if migration dirty
migrate -path apps/api/migrations -database "postgres://postgres:postgres@localhost:5433/prism?sslmode=disable" force <VERSION>
```
