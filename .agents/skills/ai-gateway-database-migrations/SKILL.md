---
name: ai-gateway-database-migrations
description: Guide for creating PostgreSQL migrations and updating repository models in RoozyLabs Prism (apps/api/migrations). Use when altering database schema, seeding new LLM models or providers, or updating repository sqlx queries.
---

# RoozyLabs Prism — Database & Migrations Guide

## 1. Migration Naming Convention

Migration files are stored sequentially in `apps/api/migrations/` using 3-digit numeric prefixes (currently `001` through `060` for Multi-Tenancy):

- `0XX_<description>.up.sql` (Forward migration)
- `0XX_<description>.down.sql` (Rollback migration)

---

## 2. Standard Query & Joining Rules

When updating list queries in `/api/internal/repository/`:
- Always use `LEFT JOIN providers p ON p.id = <table_alias>.provider_id` so that `provider_name` is returned directly from PostgreSQL.
- Support `providerID == "all"` or empty string to fetch items across ALL providers in a single unified SQL query with `LIMIT` and `OFFSET`.
- Always return paginated count using `COUNT(*)` with matching WHERE conditions.
