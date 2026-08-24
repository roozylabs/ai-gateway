# RoozyLabs Prism 💎

[![Go Version](https://img.shields.io/badge/Go-1.24-00ADD8?style=flat&logo=go)](https://golang.org)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat&logo=docker)](https://www.docker.com/)
[![CI/CD Pipeline](https://github.com/roozylabs/prism/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/roozylabs/prism/actions/workflows/ci-cd.yml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**RoozyLabs Prism** is a high-performance, infrastructure-grade **Universal AI Control Plane** and intelligent model gateway that unifies multiple AI providers (OpenAI, Anthropic, Google Gemini, OpenRouter, OpenCode) and credential pools into a single resilient execution layer.

With **RoozyLabs Prism**, your client applications and AI coding tools (such as **OpenCode**, **Claude Code**, **Antigravity**, or custom agents) connect to a single **Gateway API Key** and **Prism Gateway Endpoint**.

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
                          │ Dashboard (App) │
                          │  (Port :3000)   │
                          └────────┬────────┘
                                   │ (/api proxy)
                                   ▼
                          ┌─────────────────┐
                          │ RoozyLabs Prism │
                          │ (Go API :8080)  │
                          │                 │
                          │ • Auth          │
                          │ • Smart Router  │
                          │ • Budget Mgr    │
                          │ • Credential Pool│
                          │ • Retry (429/500)│
                          │ • Circuit Breaker│
                          │ • Streaming SSE │
                          │ • Observability │
                          └────────┬────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 ▼                 ▼                 ▼
           OpenAI API        Anthropic API      Google Gemini
```

---

## ✨ Key Features

- **🧠 Roozy Auto Smart Router (`roozy-auto`)**: Intelligent router that deterministically classifies request characteristics (Task, Complexity, Context Window), pre-filters candidate models by active provider credentials, and executes weighted candidate scoring based on the active routing policy (`balanced`, `cheap`, `quality`, or custom).
- **🎨 RoozyLabs Prism Design System**: Built strictly according to the **Prism Design System** ([`docs/DESIGN_SYSTEM.md`](file:///c:/me/projects/ai-gateway/docs/DESIGN_SYSTEM.md)) featuring a high-density, dark-first UI palette (`#08090A` canvas, `#0F1115` cards, `#8B5CF6` violet signature accent, and `Geist Mono`/`JetBrains Mono` typography for all metrics).
- **🛡️ High Availability & Circuit Breaker**: Automatic 50x error detection, 60-second credential quarantine, and instant fallback cascades to ensure zero downtime.
- **🛡️ Bot Protection & Security**: Integrated **Cloudflare Turnstile** bot protection on dashboard authentication endpoints and AES-256-GCM encrypted credential vaults.
- **💰 AI FinOps & Budget Manager**: Configurable spend limits, velocity alert thresholds (`healthy`, `warning`, `critical`, `exceeded`), burn-rate forecasting, and automatic model substitution cost recommendations.
- **⚡ Instant Zero-Delay Rotation & HTTP Pooling**: **Round Robin**, **LRU**, and **Fallback Cascade** allocation strategies with HTTP/2 connection pooling (`MaxIdleConnsPerHost: 50`) for ultra-low TTFT latency.
- **📊 Complete Audit Trail & Debugging**: Full request logging, Smart Router decision audit log (`/api/routing/decisions`), and response debugging headers (`X-Roozy-Model`, `X-Roozy-Provider`, `X-Request-ID`).
- **🧪 Routing Simulation & Playground**: Interactive simulation page (`/playground`) to test Smart Router behavior and inspect classification → scoring → selection pipelines in real-time.
- **💬 Web AI Sandbox**: In-browser chat interface (`/sandbox`) for testing Gateway API keys directly with real-time SSE streaming.
- **🔐 Google OAuth 2.0 Credential Flow**: Popup-based OAuth for Google Gemini credentials — automatically exchanges refresh tokens, encrypts and stores them, and auto-creates the credential entry.

---

## 🛠️ Technology Stack

- **Backend**: Go (Golang 1.24), Gin Web Framework, SQLx
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Ant Design v5, Prism Design System Theme
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
git clone https://github.com/roozylabs/prism.git
cd prism
cp .env.example .env
```

Start all services (Prism Go API + Next.js Dashboard + PostgreSQL + Redis):
```bash
docker compose up -d --build
```

The application stack will be available at:
- **Dashboard UI**: `http://localhost:3000`
- **Prism API Gateway**: `http://localhost:8080`

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

2. **Run Prism API**:
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
| `CLOUDFLARE_SECRET_KEY` | Cloudflare Turnstile Secret Key for bot verification | *(optional)* |
| `NEXT_PUBLIC_CLOUDFLARE_SITE_KEY` | Cloudflare Turnstile Site Key for frontend widget | *(optional)* |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID (Gemini credential flow) | *(optional)* |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret | *(optional)* |
| `GLOBAL_PROXY_URL` | Outgoing SOCKS5 / HTTP proxy URL for upstream provider requests | *(optional)* |
| `OPENCODE_MAX_CONCURRENCY` | Max concurrent streams per OpenCode provider | `2` |

> 🔒 *Note: AI Provider API Credentials (such as OpenAI or Anthropic keys) are **not stored** in `.env`. They are securely managed and encrypted in PostgreSQL via the Dashboard API.*

---

## 📚 API Endpoints Summary

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| **Health & Auth** | | | |
| `GET` | `/health` | Healthcheck API, DB, & Redis status | Public |
| `POST` | `/api/auth/login` | User Login (email/password + Turnstile) | Public |
| `GET` | `/api/auth/turnstile-config` | Public Turnstile Site Key config | Public |
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
