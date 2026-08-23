# AI Gateway 🚀

[![Go Version](https://img.shields.io/badge/Go-1.24-00ADD8?style=flat&logo=go)](https://golang.org)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat&logo=docker)](https://www.docker.com/)
[![CI/CD Pipeline](https://github.com/roozylabs/ai-gateway/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/roozylabs/ai-gateway/actions/workflows/ci-cd.yml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**AI Gateway** is a high-performance *centralized AI API Gateway* that allows you to manage multiple AI providers (OpenAI, Anthropic, Google Gemini, OpenRouter, OpenCode) and numerous API credentials in one place.

With **AI Gateway**, your AI coding tools (such as **OpenCode**, **Claude Code**, **Antigravity**, or custom applications) simply connect to a single **Gateway API Key** and **Gateway URL**.

---

## 📐 System Architecture

```text
                         CLIENTS
        ┌───────────────────┼───────────────────┐
        │                   │                   │
     OpenCode          Claude Code          Antigravity
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │ (Authorization: Bearer gw_sk_xxx)
                            ▼
                   ┌─────────────────┐
                   │  Next.js Admin  │
                   │    Dashboard    │
                   │  (Port :3000)   │
                   └────────┬────────┘
                            │ (/api proxy)
                            ▼
                   ┌─────────────────┐
                   │   AI Gateway    │
                   │  (Go API :8080) │
                   │                 │
                   │  • Auth         │
                   │  • Smart Router │
                   │  • Budget Mgr   │
                   │  • Rotation     │
                   │  • Retry (429)  │
                   │  • Circuit Brkr │
                   │  • Streaming    │
                   │  • Observability│
                   └────────┬────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
    OpenAI API        Anthropic API      Google Gemini
```

---

## ✨ Key Features

- **🧠 Roozy Auto Smart Router (`roozy-auto`)**: Intelligent router that deterministically classifies request characteristics (Task, Complexity, Context Window), pre-filters candidate models by active provider credentials, and executes weighted candidate scoring based on the active routing policy (`balanced`, `cheap`, `quality`, or custom).
- **🎯 Default Active Policy Selection**: Easily set which routing policy (`balanced`, `cheap`, `quality`, or custom) `roozy-auto` uses by default via `PUT /policies/:id/default` or the Next.js `PoliciesPage` UI.
- **🔍 Smart Router Decision Details & Prompt Observability**: Detailed audit trail (`/api/routing/decisions`) storing request prompt text previews (first 250 chars) and candidate model score breakdowns, viewable via the interactive Decision Details inspector drawer in Next.js `LogsPage`.
- **💰 AI Budget Manager & Auto Downgrade**: Configurable monthly and daily spend limits, alert thresholds (`healthy`, `warning`, `critical`, `exceeded`), and automatic model downgrade logic before hard cutoffs.
- **🔑 Centralized Credential Management & Auto-Reset**: Store and manage provider API keys with **AES-256-GCM** encryption (*encrypted at rest*). Automatic status recovery to `Normal` (Active) as soon as rate limit cooldown timers or daily 00:00 UTC resets expire.
- **⚡ Instant Zero-Delay Rotation & HTTP Pooling**: **Round Robin**, **Least Recently Used (LRU)**, and **Fallback Cascade** allocation strategies with HTTP/2 connection pooling (`MaxIdleConnsPerHost: 50`) for low TTFT latency.
- **🛡️ Clean User-Friendly Error Sanitization**: Isolates raw upstream provider errors (429 rate limits, network timeouts, internal UUIDs) into clean, transparent user-friendly JSON responses.
- **📊 Complete Audit Trail & Debugging Headers**: Full request logging (for success HTTP 200 and error 429/500/502/504 requests), Smart Router decision audit trail (`/api/routing/decisions`), and response debugging headers (`X-Roozy-Model`, `X-Roozy-Provider`, `X-Request-ID`).
- **🛡️ Provider Concurrency Limiter & Cloudflare Evasion**: In-memory Go channel semaphores (default max **2** active streams per provider) & request pacing (`350ms`) to evade WAF concurrency rate limits.
- **🌐 Outgoing Proxy Support**: Support for `GLOBAL_PROXY_URL` environment variable (SOCKS5 / HTTP Proxy) to route outbound requests through residential IPs or SSH tunnels.
- **🌊 Pass-Through Real-Time Streaming**: Pass-through Server-Sent Events (SSE) streaming with token usage collection (`stream_options: include_usage`) and real-time cost calculation (`CostUSD`).
- **📱 Responsive UI Dashboard**: Next.js 15, React 19, & Ant Design dashboard fully responsive across desktop, tablet, and mobile viewports with horizontal scroll containment.
- **🎯 Unified OpenAI-Compatible API**: OpenAI-compatible endpoints (`/v1/chat/completions`, `/v1/models`) for instant compatibility with standard AI client tools.
- **🛡️ Circuit Breaker & 50x Quarantine**: Automatic credential quarantine after 3 consecutive 50x server errors with 60-second cooldown, preventing repeated routing to failing upstream servers. Quarantine events broadcast via SSE.
- **⚡ Dynamic Latency Feedback Loop**: Redis-backed 15-minute rolling window tracking last 50 latency samples per model (TTFT + total). Feeds dynamic speed scoring penalties for high-latency models and bonuses for fast-responding models into the Smart Router candidate scorer.
- **📊 FinOps Cost Recommendations Engine**: Real-time cost analysis with daily spend velocity, projected monthly cost, budget exhaustion forecast, and model substitution savings recommendations (`GET /api/analytics/finops`).
- **🧪 Routing Playground**: Interactive simulation page (`/playground`) to test Smart Router behavior — enter a prompt, select routing policy and budget status, and visualize the complete classification → filtering → scoring → selection pipeline without executing a real request.
- **💬 Web Sandbox**: In-browser chat interface (`/sandbox`) for testing Gateway API keys directly with model selection and real-time streaming.
- **🌓 Dark/Light Theme**: Full dark and light theme toggle across the entire dashboard, persisted via local storage.
- **🔐 Google OAuth 2.0 Credential Flow**: Popup-based OAuth for Google Gemini credentials — automatically exchanges refresh tokens, encrypts and stores them, and auto-creates the credential entry.

---

## 🛠️ Technology Stack

- **Backend**: Go (Golang 1.24), Gin Web Framework, SQLx
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Ant Design, Tailwind CSS
- **Database**: PostgreSQL 15 (Single Source of Truth)
- **Cache & State Store**: Redis 7 (Rate Limiting, Cooldown, Events, State)
- **Containerization**: Multi-stage Dockerfile, Docker Compose
- **CI/CD**: GitHub Actions (Linting, Automated Testing, GHCR, SSH VPS Deployment)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- [Docker & Docker Compose](https://docs.docker.com/get-docker/) installed on your system.
- [Go 1.24+](https://go.dev/dl/) (if running/developing locally without Docker).

### 2. Running with Docker Compose

Clone the repository and copy the environment file:
```bash
git clone https://github.com/roozylabs/ai-gateway.git
cd ai-gateway
cp .env.example .env
```

Start all services (Go API + Next.js Dashboard + PostgreSQL + Redis):
```bash
docker compose up -d --build
```

The application stack will be available at:
- **Dashboard UI**: `http://localhost:3000`
- **API Gateway**: `http://localhost:8080`

Verify service health:
```bash
curl http://localhost:8080/health
```

---

## 💻 Local Development

If you want to run the Go backend directly on your local machine:

1. **Start PostgreSQL & Redis via Docker**:
   ```bash
   docker compose up -d postgres redis
   ```

2. **Run API Gateway**:
   ```bash
   cd api
   go run cmd/server/main.go
   ```

3. **Run Unit Tests**:
   ```bash
   cd api
   go test ./... -v
   ```

---

## 📄 Environment Variables Configuration

The `.env` file configures backend infrastructure settings:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `APP_ENV` | Application environment (`development` / `production` / `test`) | `production` |
| `SERVER_PORT` | Go API HTTP Server Port | `8080` |
| `APP_PORT` | Next.js Dashboard Port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Constructed from POSTGRES_* vars |
| `REDIS_URL` | Redis connection string | Constructed from REDIS_* vars |
| `JWT_SECRET` | Secret key for signing JWT Session | `your-jwt-secret-here` |
| `ENCRYPTION_KEY` | 32-byte AES-256-GCM encryption key for provider credentials | `your-encryption-key-here` |
| `HASH_KEY` | Key for hashing Gateway API Keys | `your-hash-key-here` |
| `BETTER_AUTH_SECRET` | Secret for Better Auth session management (frontend) | *(required)* |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID (Gemini credential flow) | *(optional)* |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret | *(optional)* |
| `GLOBAL_PROXY_URL` | Outgoing SOCKS5 / HTTP proxy URL for upstream provider requests | *(optional)* |
| `OPENCODE_MAX_CONCURRENCY` | Max concurrent streams per OpenCode provider | `2` |
| `MAX_RETRIES` | Max credential rotation retries on failure | `2` |
| `COOLDOWN_SECONDS` | Default 429 rate-limit cooldown duration | `60` |
| `RATE_LIMIT_PER_KEY` | Per Gateway API Key request rate limit | `100` |

> 🔒 *Note: AI Provider API Credentials (such as OpenAI or Anthropic keys) are **not stored** in `.env`. They are securely managed and encrypted in PostgreSQL via the Dashboard API.*

---

## 🔄 CI/CD Pipeline & Deployment

This project uses a unified **GitHub Actions** pipeline ([ci-cd.yml](file:///.github/workflows/ci-cd.yml)):

1. **Continuous Integration (CI)**:
   - Go code linting using `golangci-lint`.
   - Automated testing (`go test ./...`) with PostgreSQL 15 & Redis 7 service containers.
   - Go binary compilation & Docker build verification.
2. **Continuous Deployment (CD)**:
   - Build & Push Docker image to **GitHub Container Registry** (`ghcr.io/roozylabs/ai-gateway-api:latest`).
   - Automated SSH deployment to VPS executing `git pull`, `docker compose pull`, and `docker compose up -d`.

---

## 📚 API Endpoints Summary

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| **Health & Auth** | | | |
| `GET` | `/health` | Healthcheck API, DB, & Redis status | Public |
| `POST` | `/api/auth/login` | User Login (email/password) | Public |
| `GET` | `/api/auth/me` | Current session user | Session |
| `POST` | `/api/auth/logout` | Destroy session | Session |
| **Providers** | | | |
| `GET` | `/api/providers` | List AI providers | Session |
| `POST` | `/api/providers` | Create provider | Session |
| `PUT` | `/api/providers/:id` | Update provider | Session |
| `DELETE` | `/api/providers/:id` | Delete provider | Session |
| **Credentials** | | | |
| `GET` | `/api/providers/:id/credentials` | List provider credentials | Session |
| `POST` | `/api/providers/:id/credentials` | Add provider credential | Session |
| `PUT` | `/api/providers/:id/credentials/:credId` | Update credential | Session |
| `DELETE` | `/api/credentials/:credId` | Delete credential | Session |
| `POST` | `/api/providers/:id/credentials/:credId/test` | Test credential validity | Session |
| `POST` | `/api/providers/:id/credentials/:credId/reset-cooldown` | Force reset cooldown | Session |
| **Models** | | | |
| `GET` | `/api/models` | List all models | Session |
| `POST` | `/api/providers/:id/models` | Create model | Session |
| `PUT` | `/api/providers/:id/models/:modelId` | Update model | Session |
| `PATCH` | `/api/providers/:id/models/:modelId/capabilities` | Update model capability scores | Session |
| `DELETE` | `/api/providers/:id/models/:modelId` | Delete model | Session |
| **Gateway Keys** | | | |
| `GET` | `/api/gateway-keys` | List gateway API keys | Session |
| `POST` | `/api/gateway-keys` | Create gateway API key | Session |
| `DELETE` | `/api/gateway-keys/:id` | Delete gateway API key | Session |
| **Routing Policies** | | | |
| `GET` | `/api/policies` | List routing policies | Session |
| `POST` | `/api/policies` | Create policy | Session |
| `PUT` | `/api/policies/:id` | Update policy | Session |
| `DELETE` | `/api/policies/:id` | Delete policy | Session |
| `PUT` | `/api/policies/:id/default` | Set as default active policy | Session |
| `POST` | `/api/routing/simulate` | Simulate routing decision | Session |
| **Budgets** | | | |
| `GET` | `/api/budgets` | List budgets | Session |
| `POST` | `/api/budgets` | Create budget | Session |
| `PUT` | `/api/budgets/:id` | Update budget | Session |
| `DELETE` | `/api/budgets/:id` | Delete budget | Session |
| `GET` | `/api/budgets/status` | Real-time budget status | Session |
| **Logs & Analytics** | | | |
| `GET` | `/api/logs` | Paginated request logs | Session |
| `GET` | `/api/analytics/logs` | Logs analytics breakdown | Session |
| `GET` | `/api/analytics/finops` | Cost recommendations & burn-rate forecast | Session |
| `GET` | `/api/routing/decisions` | Smart Router decision audit log | Session |
| **Dashboard & SSE** | | | |
| `GET` | `/api/dashboard/stats` | Dashboard KPI statistics | Session |
| `GET` | `/api/dashboard/usage` | Usage chart data | Session |
| `GET` | `/api/dashboard/health` | Provider health status | Session |
| `GET` | `/api/dashboard/active-streams` | Currently active streaming requests | Session |
| `GET` | `/api/sse` | Real-time Server-Sent Events stream | Session |
| **Settings** | | | |
| `GET` | `/api/settings` | List global settings | Session |
| `PUT` | `/api/settings` | Update global settings | Session |
| **Sandbox** | | | |
| `POST` | `/api/sandbox/chat/completions` | Sandbox chat (auth via key prefix) | Session |
| **Gateway (OpenAI-Compatible)** | | | |
| `GET` | `/v1/models` | List active models (including `roozy-auto`) | Gateway Key |
| `POST` | `/v1/chat/completions` | Inference API (Smart Router, Streaming, Retry) | Gateway Key |

---

## 📝 License

Distributed under the [MIT License](LICENSE).
