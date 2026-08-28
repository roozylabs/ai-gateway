# Configuration Audit & Classification Runbook — RoozyLabs Prism

**Document Version:** v2.7.0  
**Verification Status:** `VERIFIED`  

---

## Environment Variable Classification Matrix

The root `.env.example` file defines configuration parameters classified into 6 categories:

| Environment Variable | Category | Required in Prod? | Secret? | Default / Example Value | Impact if Missing |
|----------------------|----------|-------------------|---------|-------------------------|-------------------|
| `APP_ENV` | Environment | **Required** | No | `production` | Fallbacks to dev defaults. |
| `SERVER_PORT` | Network | Optional | No | `8080` | Listens on port 8080. |
| `APP_PORT` | Network | Optional | No | `3000` | Listens on port 3000. |
| `POSTGRES_DB` | Database | **Required** | No | `prism` | Database connection fails. |
| `POSTGRES_USER` | Database | **Required** | No | `postgres` | Database authentication fails. |
| `POSTGRES_PASSWORD` | Database | **Required** | **YES** | `<SECRET>` | **CRITICAL: Database connection fails.** |
| `POSTGRES_PORT` | Database | Optional | No | `5433` | Connects on port 5433 (host). |
| `REDIS_PASSWORD` | Redis | **Required** | **YES** | `<SECRET>` | **CRITICAL: Redis authentication fails.** |
| `REDIS_PORT` | Redis | Optional | No | `6379` | Connects on port 6379. |
| `JWT_SECRET` | Security | **Required** | **YES** | `<SECRET>` | **CRITICAL: Auth tokens rejected.** |
| `ENCRYPTION_KEY` | Security | **Required** | **YES** | `<SECRET>` | **CRITICAL: Credential decryption fails.** |
| `HASH_KEY` | Security | **Required** | **YES** | `<SECRET>` | **CRITICAL: Key hashing fails.** |
| `BETTER_AUTH_SECRET` | Auth | **Required** | **YES** | `<SECRET>` | Next.js dashboard login fails. |
| `BETTER_AUTH_URL` | Auth | **Required** | No | `https://app.prism.roozylabs.com` | OAuth callbacks break. |
| `API_URL` | Internal Net | **Required** | No | `http://api:8080` | App dashboard cannot reach API. |
| `ALLOWED_ORIGINS` | Security | **Required** | No | `https://app.prism.roozylabs.com` | CORS requests blocked. |

---

## Startup Validation Rules

The API gateway validates mandatory configuration at startup in `config.Load()` (`apps/api/internal/config/config.go`):

1. **`ENCRYPTION_KEY` Validation**: Must be set and non-default in `production` mode.
2. **`JWT_SECRET` Validation**: Must be set and non-default.
3. **Database URL Validation**: Must contain valid PostgreSQL connection string schema.
4. **Redis URL Validation**: Must contain valid Redis host & password schema.

If any required secret is missing or set to placeholder defaults in production mode, the application halts immediately with exit code 1 to prevent silent security degradation.
