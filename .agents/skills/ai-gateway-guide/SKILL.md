---
name: ai-gateway-guide
description: Master knowledge base and developer guide for AI Gateway (RoozyLabs). Details architecture, Go proxy engine, adapters (OpenAI, Anthropic, Google, OpenCode), database migrations, Next.js dashboard, and developer workflows. Use when modifying proxy logic, adding providers, updating schemas, or building AI agent integrations.
---

# RoozyLabs AI Gateway - Master Knowledge Base & Developer Guide

## 1. Project Overview & System Architecture

AI Gateway is a centralized, high-performance LLM API Gateway and Model Router. It consolidates multiple LLM upstream providers (OpenAI, Anthropic, Google Gemini, OpenCode Zen, etc.) into a unified, OpenAI-compatible endpoint (`/v1/chat/completions`).

```
[Client / OpenCode CLI / App]
            │ (HTTP Bearer gw_sk_*)
            ▼
┌────────────────────────────────────────────────────────┐
│ Next.js 15 Dashboard / API Proxy (Port 3000)          │
│ Routes /api/v1 -> Backend (Port 8080)                  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Go API Gateway Engine (Port 8080)                      │
│ ├── Middleware (Auth, Rate Limiter)                    │
│ ├── Router (ResolveWithFallback)                       │
│ └── Proxy Engine (Proxy, ProxyStream)                  │
└───────────┬────────────────────────────┬───────────────┘
            │                            │
            ▼                            ▼
┌───────────────────────┐   ┌────────────────────────────┐
│ PostgreSQL 16 DB      │   │ Redis Store                │
│ (Models, Credentials, │   │ (Cooldown TTLs, Events,    │
│ Gateway Keys, Logs)   │   │ Rate Limit Counters)       │
└───────────────────────┘   └────────────────────────────┘
            │
            ▼ (Upstream Adapters: OpenAI, Anthropic, Google, OpenCode)
┌────────────────────────────────────────────────────────┐
│ Upstream AI Providers (OpenAI, Google, OpenCode, etc.) │
└────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

- `/api`: Go Backend Source Code
  - `/cmd/server/main.go`: Application entrypoint, route registration (`/v1` and `/api/v1`).
  - `/internal/proxy`: Core proxy engine (`engine.go`), router (`router.go`), and provider adapters (`openai.go`, `anthropic.go`, `google.go`, `opencode.go`).
  - `/internal/handlers`: HTTP handlers for Gateway, Credentials, Models, Keys, Logs, and Dashboard.
  - `/internal/repository`: Data access repositories with PostgreSQL `sqlx`.
  - `/internal/redis`: Redis cooldown store (`cooldown.go`) and pub/sub event publisher.
  - `/migrations`: Sequential SQL database migration files.
- `/app`: Next.js 15 Frontend Dashboard
  - `/app`: Next.js App Router pages (`logs`, `gateway-keys`, `models`, `credentials`, `sandbox`).
  - `/components/atoms`: Reusable UI components (`DataTable.tsx`, `PageHeader.tsx`, `StatusTag.tsx`).
  - `/lib/api.ts`: API client layer with `PaginatedResult<T>` interfaces.

---

## 3. Critical Backend Engine & Proxy Rules (`/api/internal/proxy`)

### 3.1. Upstream Model Mapping
- **`req.Model` vs `route.Model.Name`**: `engine.go` resolves model aliases from the database. If `route.Model.Name` (Upstream Model Name) is non-empty, it overrides `req.Model` before sending the payload upstream.
- **Google Gemini Rule**: Official Google OpenAI-compatible endpoint deprecated legacy 1.5/2.0 model names. Upstream model name in the database MUST be set to `gemini-3.6-flash` or `gemini-flash-latest`.

### 3.2. Provider Adapter Requirements
- **OpenCode Zen (`opencode.go`)**: OpenCode Zen API blocks requests without an OpenCode CLI user-agent. `OpenCodeAdapter.BuildRequest` MUST explicitly set `httpReq.Header.Set("User-Agent", "opencode-cli/1.0")`.
- **SSE Stream JSON Casing**: `ProviderResponse` and `Choice` structs in `provider.go` MUST have exact JSON tags (`json:"id"`, `json:"model"`, `json:"choices"`, `json:"usage"`, `json:"delta"`, `json:"finish_reason"`).
- **No `omitempty` on `Choices`**: `Choices` field MUST NOT use `omitempty` (`json:"choices"`). `engine.go` MUST initialize `chunk.Choices = []Choice{}` when `nil` so every SSE line contains `"choices": [...]` to pass client Zod validation.

### 3.3. HTTP Transport & Cooldown Engine
- **HTTP Transport**: `NewEngine` configures `http.Transport` with `ResponseHeaderTimeout: 30 * time.Second`, `TLSHandshakeTimeout: 10 * time.Second`, `DialTimeout: 10 * time.Second`, and `MaxIdleConns: 100` for fast connection pooling.
- **Smart 429 Quota Detection**: When 429 occurs, if response contains `FreeUsageLimitError` or daily quota messages, set Redis Cooldown TTL to 86,400s (24 hours) and update status to `rate_limited`.

---

## 4. API Response & Pagination Standard

All list endpoints (`/logs`, `/gateway-keys`, `/models`, `/credentials`) MUST return standard paginated JSON:

```json
{
  "data": [...],
  "total": 39,
  "page": 1,
  "pageSize": 10
}
```

- **Backend Query Standard**: Repository queries for models and credentials MUST use `LEFT JOIN providers p ON p.id = m.provider_id` to query across all providers when `providerID == "all"` or empty, avoiding client-side `Promise.all` offset bugs.

---

## 5. UI Real-time Cooldown & DataTable Rules (`/app`)

- **Real-time Cooldown Tag**: `app/app/credentials/page.tsx` uses `<CooldownCountdownTag>` component to decrement TTL second-by-second (`34s -> 33s -> ... -> 0s`) in real time, with `refetchInterval: 5000` to auto-sync with Redis.
- **DataTable Paginator**: `DataTable.tsx` uses `mergedPagination` supporting page size options (`10`, `20`, `50`, `100`), quick jumper, and total items formatter.

---

## 6. OpenCode CLI Integration Guide

To configure OpenCode CLI to use AI Gateway, save to `~/.config/opencode/opencode.jsonc` or `./opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "roozylabs-ai-gateway": {
      "options": {
        "baseURL": "http://<SERVER_IP>:8080/v1",
        "apiKey": "gw_sk_<YOUR_GATEWAY_KEY>"
      },
      "models": {
        "gemini-3.6-flash": {
          "name": "Gemini 3.6 Flash"
        },
        "big-pickle": {
          "name": "Big Pickle"
        }
      }
    }
  }
}
```

*Note: Use singular `"provider"` and `"options"` block in OpenCode config schema.*
