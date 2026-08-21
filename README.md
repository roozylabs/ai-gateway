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
                  │   AI Gateway    │
                  │                 │
                  │  • Auth         │
                  │  • Smart Router │
                  │  • Budget Mgr   │
                  │  • Rotation     │
                  │  • Retry (429)  │
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

- **🧠 Roozy Auto Smart Router (`roozy-auto`)**: Intelligent router that deterministically classifies request characteristics (Task, Complexity, Context Window) and executes weighted candidate scoring to select the most optimal model/provider.
- **💰 AI Budget Manager & Auto Downgrade**: Configurable monthly and daily spend limits, alert thresholds (`healthy`, `warning`, `critical`, `exceeded`), and automatic model downgrade logic before hard cutoffs.
- **🔑 Centralized Credential Management**: Store and manage multiple provider API keys across accounts in one place with **AES-256-GCM** encryption (*encrypted at rest*).
- **⚡ Instant Zero-Delay Rotation (Pre-Filtered Ready Pool)**: **Round Robin**, **Least Recently Used (LRU)**, and **Fallback Cascade** allocation strategies pre-filtered against active Redis 429 cooldowns.
- **🛡️ Clean User-Friendly Error Sanitization**: Isolates raw upstream provider errors (429 rate limits, network timeouts, internal UUIDs) into clean, transparent user-friendly JSON responses.
- **📊 Complete Audit Trail & Debugging Headers**: Full request logging (for success HTTP 200 and error 429/500/502/504 requests), Smart Router decision audit trail (`/api/routing/decisions`), and response debugging headers (`X-Roozy-Model`, `X-Roozy-Provider`, `X-Request-ID`).
- **🛡️ Provider Concurrency Limiter & Cloudflare Evasion**: In-memory Go channel semaphores (default max **2** active streams per provider) & request pacing (`350ms`) to evade WAF concurrency rate limits.
- **🌐 Outgoing Proxy Support**: Support for `GLOBAL_PROXY_URL` environment variable (SOCKS5 / HTTP Proxy) to route outbound requests through residential IPs or SSH tunnels.
- **🌊 Pass-Through Real-Time Streaming**: Pass-through Server-Sent Events (SSE) streaming with token usage collection (`stream_options: include_usage`) and real-time cost calculation (`CostUSD`).
- **🎯 Unified OpenAI-Compatible API**: OpenAI-compatible endpoints (`/v1/chat/completions`, `/v1/models`) for instant compatibility with standard AI client tools.

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
- [Go 1.23+](https://go.dev/dl/) (if running/developing locally without Docker).

### 2. Running with Docker Compose

Clone the repository and copy the environment file:
```bash
git clone https://github.com/roozylabs/ai-gateway.git
cd ai-gateway
cp .env.example .env
```

Start all services (Go API + PostgreSQL + Redis):
```bash
docker compose up -d --build
```

The API Gateway will be up and running at:
`http://localhost:8080`

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
| `APP_ENV` | Application environment (`development` / `production` / `test`) | `development` |
| `SERVER_PORT` | HTTP Server Port | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/ai_gateway?sslmode=disable` |
| `REDIS_URL` | Redis connection string | `redis://:redis@localhost:6379` |
| `JWT_SECRET` | Secret key for signing JWT Session | `your-jwt-secret-here` |
| `ENCRYPTION_KEY` | 32-byte AES-256-GCM encryption key for provider credentials | `your-encryption-key-here` |
| `HASH_KEY` | Key for hashing Gateway API Keys | `your-hash-key-here` |

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
| `GET` | `/health` | Healthcheck API, DB, & Redis status | Public |
| `POST` | `/api/auth/login` | User Login | Public |
| `GET` | `/api/providers` | Manage AI Providers | Session |
| `POST` | `/api/providers/:id/credentials` | Add Provider Credential | Session |
| `GET` | `/api/policies` | Manage Routing Policies | Session |
| `GET` | `/api/budgets` | Manage AI Expenditure Budgets | Session |
| `GET` | `/api/routing/decisions` | Smart Router Decision Audit Log | Session |
| `GET` | `/v1/models` | List active AI models (including `roozy-auto`) | Gateway Key (`Bearer gw_sk_...`) |
| `POST` | `/v1/chat/completions` | Inference API (Supports Smart Router & Streaming) | Gateway Key (`Bearer gw_sk_...`) |

---

## 📝 License

Distributed under the [MIT License](LICENSE).
