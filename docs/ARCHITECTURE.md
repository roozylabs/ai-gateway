# Technical Architecture — AI Gateway

| Metadata | Detail |
| :--- | :--- |
| **Version** | 1.0 |
| **Status** | Draft |
| **Date** | 18 August 2026 |

---

## 1. System Overview

```text
                           INTERNET
                               │
                     ┌─────────┴─────────┐
                     │                   │
                     ↓                   ↓
              app.ai-gateway.dev   api.ai-gateway.dev
                     │                   │
                     ↓                   ↓
                 Next.js              Go + Gin
              (Dashboard)          (API Gateway)
                     │                   │
                     │             ┌─────┼─────┐
                     │             │     │     │
                     │             ↓     ↓     ↓
                     │           Auth  Router Retry
                     │                   │
                     │             Credential Pool
                     │                   │
                     │          ┌────────┴────────┐
                     │          ↓                 ↓
                     │       Redis           PostgreSQL
                     │          │                 │
                     │          └────────┬────────┘
                     │                   ↓
                     │             Provider Adapter
                     │                   │
                     │       ┌───────────┼───────────┐
                     │       ↓           ↓           ↓
                     │    OpenAI      Anthropic    Google
                     │
                     └──────────── Dashboard
```

---

## 2. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14+ | Dashboard UI |
| **UI Library** | Ant Design | Component library |
| **Forms** | React Hook Form + Zod | Form handling & validation |
| **Server State** | TanStack Query | Data fetching & caching |
| **Backend** | Go 1.22+ | API Gateway server |
| **HTTP Router** | Gin | HTTP framework |
| **Database** | PostgreSQL 15 | Primary data store |
| **Cache** | Redis 7 | Credential cooldown, rate limiting |
| **ORM** | sqlc | Type-safe SQL queries |
| **Migrations** | golang-migrate | Database schema management |
| **Reverse Proxy** | Traefik | SSL termination, routing |
| **Containerization** | Docker Compose | Development & deployment |

---

## 3. Component Responsibilities

### 3.1 Go Gateway (`api.ai-gateway.dev`)

The core API gateway handling all client requests.

| Module | Responsibility |
| :--- | :--- |
| `auth/` | Gateway API key validation, user context |
| `api/` | HTTP handlers, request/response mapping |
| `credentials/` | Credential pool management, selection, rotation |
| `providers/` | Provider adapter interface, OpenAI/Anthropic/Google adapters |
| `routing/` | Model-to-provider resolution, round-robin selection |
| `proxy/` | HTTP proxy, streaming pass-through |
| `retry/` | Retry logic, failover, 429 detection |
| `ratelimit/` | Gateway-level rate limiting per API key |
| `usage/` | Request logging, token tracking |
| `logging/` | Structured request logging |
| `health/` | Health check endpoints |

### 3.2 Next.js Dashboard (`app.ai-gateway.dev`)

Web interface for managing the gateway.

| Feature | Description |
| :--- | :--- |
| Provider Management | Add/edit/enable/disable providers |
| Credential Management | Add/edit/delete/enable/disable credentials, test connection |
| Gateway API Keys | Create/revoke API keys |
| Monitoring | Request logs, usage stats, health dashboard |
| Settings | General configuration, security settings |

---

## 4. Request Lifecycle

```text
Client (OpenCode / Claude Code)
  │
  ↓ Authorization: Bearer gw_sk_xxxxx
  │
  ├─→ [1] Authentication
  │      - Hash gateway API key
  │      - Lookup in database/cache
  │      - Extract user context
  │
  ├─→ [2] Request Validation
  │      - Validate model name
  │      - Check API key permissions
  │
  ├─→ [3] Router
  │      - Resolve model → provider
  │      - Find available credential pool
  │
  ├─→ [4] Credential Selection
  │      - Round-robin from ACTIVE credentials
  │      - Skip RATE_LIMITED / DISABLED
  │      - Thread-safe atomic selection
  │
  ├─→ [5] Provider Adapter
  │      - Transform request to provider format
  │      - Inject provider API key (from encrypted storage)
  │
  ├─→ [6] HTTP Proxy (Upstream)
  │      - Forward request to provider
  │      - Handle streaming (SSE pass-through)
  │
  ├─→ [7] Response Handling
  │      - Success → Stream to client
  │      - 429 → Mark credential RATE_LIMITED, retry with next credential
  │      - 401/403 → Mark credential INVALID, retry
  │      - 500/502/503 → Retry with next credential
  │
  └─→ [8] Usage Recording
         - Log request (model, tokens, latency, status)
         - Update usage counters
```

---

## 5. Provider Adapter Pattern

```text
         ProviderAdapter (Interface)
                 │
    ┌────────────┼────────────┐
    ↓            ↓            ↓
 OpenAI      Anthropic     Google
 Adapter     Adapter       Adapter
    │            │            │
    ↓            ↓            ↓
 Normalize   Normalize    Normalize
 Request      Request      Request
    │            │            │
    ↓            ↓            ↓
 Forward     Forward      Forward
 to API       to API       to API
    │            │            │
    ↓            ↓            ↓
 Normalize   Normalize    Normalize
 Response    Response     Response
 (incl.       (incl.       (incl.
  SSE)        SSE)         SSE)
```

Each adapter implements:
- `TransformRequest()` — Convert unified format to provider-specific
- `TransformResponse()` — Normalize provider response
- `HandleStream()` — Process SSE stream events
- `NormalizeError()` — Convert provider errors to unified format
- `ExtractTokens()` — Parse token usage from response

---

## 6. Credential Rotation

### Strategy: Round Robin (Health-Aware)

```text
Credential Pool (Anthropic):
  ├── [A] ACTIVE     ← last used: 2s ago
  ├── [B] ACTIVE     ← last used: 5s ago
  └── [C] RATE_LIMITED (cooldown: 45s remaining)

Request Flow:
  Request #1 → Credential A
  Request #2 → Credential B
  Request #3 → Credential A  (skip C, it's rate limited)
  Request #4 → Credential B
  ...
```

### 429 Handling

```text
Request → Credential A → 429
  │
  ├─→ Mark A as RATE_LIMITED in Redis
  ├─→ Read Retry-After header (or default: 60s)
  ├─→ Set cooldown: SET credential:{id}:cooldown EX {retry-after}
  │
  └─→ Retry with Credential B
        │
        ├─→ Success → Return to client
        └─→ 429 again → Retry with Credential C
              │
              └─→ All exhausted → Return 503 provider_exhausted
```

---

## 7. Streaming Architecture

The gateway uses **pass-through streaming** — no buffering of complete responses.

```text
Client                Gateway                 Provider
  │                      │                       │
  │   POST /v1/chat/     │                       │
  │   completions        │                       │
  │ ─────────────────→   │                       │
  │                      │   POST /v1/chat/      │
  │                      │   completions         │
  │                      │ ──────────────────→   │
  │                      │                       │
  │                      │   HTTP 200            │
  │                      │   Content-Type:       │
  │                      │   text/event-stream   │
  │                      │ ←──────────────────   │
  │                      │                       │
  │   HTTP 200           │                       │
  │   Content-Type:      │                       │
  │   text/event-stream  │                       │
  │ ←──────────────────  │                       │
  │                      │                       │
  │   data: {...}        │   data: {...}         │
  │ ←──────────────────  │ ←──────────────────   │
  │   data: {...}        │   data: {...}         │
  │ ←──────────────────  │ ←──────────────────   │
  │   data: [DONE]       │   data: [DONE]        │
  │ ←──────────────────  │ ←──────────────────   │
```

**Key Points:**
- No buffering — stream bytes directly from provider to client
- Use `io.Copy` or similar for efficient streaming
- Token usage extracted from final chunk (provider-specific)
- Request logged after stream completes

---

## 8. Security Architecture

### 8.1 Credential Encryption

```text
Provider API Key (plaintext)
        │
        ↓
   AES-256-GCM Encryption
        │
        ↓
   Encrypted Blob (stored in PostgreSQL)
```

- Encryption key from `ENCRYPTION_KEY` environment variable
- Each credential encrypted individually
- Decrypted only at request time, never exposed to client

### 8.2 Gateway API Key Hashing

```text
Gateway API Key (plaintext): gw_sk_xxxxx
        │
        ↓
   SHA-256 Hash
        │
        ↓
   Stored in PostgreSQL
```

- Plaintext shown only once at creation
- Authentication via hash comparison
- Never logged or exposed in responses

### 8.3 Security Boundaries

| Boundary | Rule |
| :--- | :--- |
| Client → Gateway | Only sees Gateway API Key |
| Gateway → Provider | Only Gateway server knows provider credentials |
| Logs | Never store plaintext credentials |
| Errors | Never expose credential details |
| Frontend | API keys displayed as masked (`sk-ant-••••1234`) |

### 8.4 Dashboard Authentication (Better Auth)

```text
┌─────────────────────────────────────────────────────────────┐
│                      Next.js Dashboard                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐                       │
│  │ Login Page   │    │ Dashboard    │                       │
│  │ (Public)     │    │ (Protected)  │                       │
│  └──────┬───────┘    └──────┬───────┘                       │
│         │                   │                                │
│         └───────────────────┼────────────────────────────────┘
│                             │                                │
│                    ┌────────▼────────┐                       │
│                    │  Better Auth    │                       │
│                    │  Client SDK     │                       │
│                    └────────┬────────┘                       │
│                             │                                │
└─────────────────────────────┼────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  /api/auth/*      │
                    │  (Route Handler)  │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Better Auth      │
                    │  Server SDK       │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  PostgreSQL       │
                    │  (Auto-created    │
                    │   tables)         │
                    └───────────────────┘
```

**Key Points:**
- Email/password authentication only (no register - personal use)
- User seeded via SQL on first deploy
- All routes protected except `/login`
- Session managed via HTTP-only cookies

---

## 9. Rate Limiting (Multi-Tier)

### Tier 1: Gateway Level

```text
Per Gateway API Key:
  - 100 requests/minute (configurable)
  - Stored in Redis with sliding window
  - Key: gateway:{api_key_hash}:rate_limit
```

### Tier 2: Provider Credential Level

```text
Per Credential:
  - Follows provider's native rate limit
  - Automatic cooldown on 429
  - Stored in Redis with TTL
  - Key: credential:{id}:cooldown
```

---

## 10. Deployment Topology

### Development

```text
Docker Compose:
  ├── next-app        (port 3000)
  ├── go-api          (port 8080)
  ├── postgres        (port 5432)
  └── redis           (port 6379)
```

### Production (Sumopod VPS)

```text
                        Sumopod VPS (4GB RAM, 2 vCPU)
                              │
                        ┌─────┴─────┐
                        │  Traefik   │
                        │  (SSL +    │
                        │  Routing)  │
                        └─────┬─────┘
                              │
               ┌──────────────┼──────────────┐
               ↓              ↓              ↓
         app.domain.com  api.domain.com  traefik.dashboard
               │              │
               ↓              ↓
           Next.js        Go + Gin
               │              │
               │        ┌─────┼─────┐
               │        ↓     ↓     ↓
               │      Auth  Router Retry
               │              │
               │        Credential Pool
               │              │
               │       ┌──────┴──────┐
               │       ↓             ↓
               │    Redis       PostgreSQL
               │       │             │
               │       └──────┬──────┘
               │              ↓
               │        Provider Adapter
               │              │
               │      ┌───────┼───────┐
               │      ↓       ↓       ↓
               │   OpenAI  Anthropic  Google
               │
               └───────── Dashboard
```

---

## 11. Error Normalization

All provider errors are normalized to a unified format:

```json
{
  "error": {
    "type": "provider_exhausted",
    "message": "No available credentials for this provider.",
    "code": 503
  }
}
```

| Error Type | HTTP Status | Description |
| :--- | :--- | :--- |
| `invalid_request` | 400 | Malformed request body |
| `unauthorized` | 401 | Invalid gateway API key |
| `forbidden` | 403 | API key lacks permission |
| `rate_limited` | 429 | All credentials rate limited |
| `provider_error` | 502 | Upstream provider error |
| `provider_exhausted` | 503 | No available credentials |
| `gateway_error` | 500 | Internal gateway error |

---

## 12. Observability

### Request Logging

Every request is logged with:

```json
{
  "request_id": "req_8sd78s",
  "timestamp": "2026-08-18T10:42:00Z",
  "gateway_api_key": "gw_sk_****",
  "provider": "anthropic",
  "model": "claude-sonnet",
  "credential_id": "cred_abc123",
  "status_code": 200,
  "latency_ms": 1820,
  "input_tokens": 4281,
  "output_tokens": 1204,
  "retry_count": 1
}
```

### Metrics

| Metric | Description |
| :--- | :--- |
| Requests per second (RPS) | Total request throughput |
| Success rate | Percentage of 2xx responses |
| Error rate | Percentage of 4xx/5xx responses |
| 429 rate | Rate limit hit frequency |
| P50/P95/P99 latency | Response time percentiles |
| Token usage | Input/output/total tokens |
| Provider breakdown | Requests per provider |
| Credential breakdown | Usage per credential |

---

## 13. API Endpoints Summary

### Gateway API (Client-facing)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/v1/models` | List available models |
| `POST` | `/v1/chat/completions` | Chat completion (streaming) |
| `POST` | `/v1/responses` | Responses API |

### Admin API (Dashboard-facing)

#### Authentication (Better Auth)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/sign-in/email` | Login with email/password |
| `POST` | `/api/auth/sign-out` | Logout |
| `GET` | `/api/auth/get-session` | Get current session |

#### Provider Management

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/providers` | List providers |
| `POST` | `/api/providers` | Create provider |
| `GET` | `/api/providers/:id` | Get provider |
| `PATCH` | `/api/providers/:id` | Update provider |
| `DELETE` | `/api/providers/:id` | Delete provider |

#### Credential Management

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/credentials` | List credentials |
| `POST` | `/api/credentials` | Create credential |
| `GET` | `/api/credentials/:id` | Get credential |
| `PATCH` | `/api/credentials/:id` | Update credential |
| `DELETE` | `/api/credentials/:id` | Delete credential |
| `POST` | `/api/credentials/:id/test` | Test credential |
