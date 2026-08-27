# RoozyLabs Prism

[![Go Version](https://img.shields.io/badge/Go-1.25-00ADD8?style=flat&logo=go)](https://golang.org)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.5.23-black?style=flat&logo=next.js)](https://nextjs.org)
[![Astro](https://img.shields.io/badge/Astro-5.0-BC52EE?style=flat&logo=astro)](https://astro.build)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat&logo=docker)](https://www.docker.com/)
[![CI/CD Pipeline](https://github.com/roozylabs/prism/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/roozylabs/prism/actions/workflows/ci-cd.yml)
[![Version](https://img.shields.io/badge/Version-2.6.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**RoozyLabs Prism** is a high-performance, infrastructure-grade **Universal AI Control Plane** and intelligent model gateway that unifies multiple AI providers (OpenAI, Anthropic, Google Gemini, OpenRouter, OpenCode Free) and credential pools into a single resilient execution layer.

With **Prism**, your client applications and AI coding tools (such as **OpenCode CLI**, **Claude Code**, **Antigravity IDE**, **LangChain**, or custom agents) connect to a single **Gateway API Key** and **Prism Gateway Endpoint**.

---

## Public Live Domains & Endpoints

- **Public Landing Page**: [https://prism.roozylabs.com](https://prism.roozylabs.com)
- **Admin Console Dashboard**: [https://app.prism.roozylabs.com](https://app.prism.roozylabs.com)
- **Model Gateway API Proxy**: [https://api.prism.roozylabs.com](https://api.prism.roozylabs.com)

---

## System Architecture

```text
                                CLIENTS & AGENTS
               ┌───────────────────────┼───────────────────────┐
               │                       │                       │
         OpenCode CLI             Claude Code             Antigravity IDE
               │                       │                       │
               └───────────────────────┼───────────────────────┘
                                       │ (Authorization: Bearer gw_sk_xxx)
                                       │ (Header: X-Prism-Agent-ID: dev-agent)
                                       ▼
                              ┌─────────────────┐
                              │   Next.js App   │
                              │ Console & Web   │
                              │ (apps/app & web)│
                              └────────┬────────┘
                                       │ (/api proxy)
                                       ▼
                              ┌─────────────────┐
                              │ RoozyLabs Prism │
                              │ (Go API :8080)  │
                              │                 │
                              │ • Auth & Tenant │
                              │ • Smart Router  │
                              │ • Tool Gateway  │
                              │ • Resource Gwy  │
                              │ • MCP Gateway   │
                              │ • Audit Vault   │
                              │ • CircuitBreaker│
                              │ • Metering Engine│
                              └────────┬────────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     ▼                 ▼                 ▼
               OpenAI / Gemini   Tool/Resource Gwy    MCP Protocol
                 Inference          (REST/SQL)       (JSON-RPC 2.0)
```

---

## Key Features & Architecture Pillars

- **Organizational AI Control Plane & Pipeline Orchestrator**: Decoupled execution pipeline (`ExecutionOrchestrator` in `internal/service/orchestrator.go`) and pre-execution gate (`AdmissionController` in `internal/proxy/admission.go`) sequencing RBAC, Agent Governance, Tenant Quotas, and Multi-Level Budget Policies BEFORE provider execution. See [Prism Runtime Architecture](docs/prism_runtime_architecture.md).
- **Authoritative Tenant Security**: `GatewayAPIKey` is authoritative for Organization ownership. Client headers (`X-Prism-Org-ID`) can only narrow scope within authorized organizations; cross-org header spoofing returns HTTP 403 Forbidden (`tenant_security_error`).
- **Prism Auto Smart Router & Adaptive Routing Engine (`prism-auto`)**: Intelligent prompt router executing multi-factor dynamic scoring (`quality`, `cost`, `speed`, `health`), candidate factor breakdown API (`/v1/routing/simulate`), and automatic fallback cascades.
- **Credential Intelligence & Dynamic Health Scoring**: Dynamic 0–100 health scoring combining success rate, cooldown penalties, and remaining quotas with a 5-state machine (`HEALTHY`, `DEGRADED`, `COOLDOWN`, `EXHAUSTED`, `DISABLED`) and OpenTelemetry metric reporting (`prism_credential_health_score`).
- **Multi-Tenant Architecture & SaaS Platform**: Full multi-tenant isolation with a 4-level hierarchy (`Organization` ──► `Workspace` ──► `Project` ──► `Agents`), PostgreSQL Row-Level Security (RLS migrations `055`–`061`), HKDF-SHA256 derived tenant encryption vaults, and real-time consumption metering (`MeteringService`).
- **Agent Gateway & Infrastructure**: Identifies and governs autonomous AI agents (`X-Prism-Agent-ID`) with granular permitted models, allowed tools, resource boundaries, and budget caps (`/agents`).
- **Agent Templates Engine & 1-Click Instantiation**: Pre-packaged agent role templates (Software Engineer, DevOps Specialist, QA Engineer, Data Analyst) with default model permissions, tool boundaries, and 1-click instantiation gallery UI (`/agent-templates`).
- **Paperclip Orchestrator Adapter (Phase 5)**: First-class integration adapter for the Paperclip autonomous agent orchestrator featuring agent auto-registration, task/workflow context extraction (`X-Paperclip-Task-ID`), and dedicated proxy endpoints (`/v1/adapters/paperclip`).
- **Official Python SDK (`roozylabs-prism` v2.1.0)**: Published PyPI package providing synchronous (`Prism`) and asynchronous (`AsyncPrism`) HTTP clients for Python AI agents, CrewAI, LangChain, and ML applications with zero-dependency fallback.
- **Enterprise Identity, Permissions & Governance (RBAC)**: Declarative Policy Engine with **`DENY` precedence** and wildcard matching (`allow`/`deny` rules) enforcing strict cross-domain authorization (`/governance`).
- **End-to-End Cryptographic AI Audit Trail**: SHA-256 tamper-proof hash signature log capturing 6-dimensional execution trails (WHO, REQUEST, MODEL, TOOLS/RESOURCES, COST, OUTCOME) with real-time verification (`/audit-trail`).
- **Tool Gateway**: Control plane for custom function calling and external REST API tools with priority failover routing, header injection, and sandbox execution (`/tools`).
- **Resource Gateway**: Dynamic data fetching layer supporting REST API resources and direct PostgreSQL relational database querying with parameterized SQL templates (`/resources`).
- **MCP (Model Context Protocol) Gateway & Catalog Registry**: Centralized protocol gateway and discovery marketplace for remote HTTP/SSE Model Context Protocol servers featuring automatic capability scanning, RLS tenant isolation (`/v1/mcp/registry`), and visual Next.js Catalog Explorer UI (`/mcp`).
- **Prism Design System**: High-density, dark-first UI palette (`#08090A` canvas, `#0F1115` cards, `#8B5CF6` violet signature accent, and `JetBrains Mono` typography for all metrics).
- **High Availability & Circuit Breaker**: Automatic 50x error detection, 60-second credential quarantine, and instant fallback cascades to ensure zero downtime.
- **AI FinOps & Budget Manager**: Configurable spend limits, velocity alert thresholds (`healthy`, `warning`, `critical`, `exceeded`), burn-rate forecasting, and automatic model cost recommendations.
- **Instant Zero-Delay Rotation & HTTP Pooling**: **Round Robin**, **LRU**, and **Fallback Cascade** allocation strategies with HTTP/2 connection pooling (`MaxIdleConnsPerHost: 50`).
- **Developer Web Sandbox & Execution Console (`/sandbox`)**: Isolated prompt evaluation sandbox featuring React Hook Form (`useForm`), Zod validation, custom React Query mutation hooks (`useSandboxExecutionMutation`), real-time SSE streaming (< 500ms TTFT), required Gateway Key context (`gw_sk_...`), dynamic Smart Router policy selection (`usePoliciesQuery`), `Routed: {model}` badge display, responsive layout padding fixes (`w-full min-w-0`), copy result feedback, and rich code block formatting (`FormattedSandboxOutput`).
- **Dry-Run Routing Simulator Playground (`/playground`)**: Pure dry-run simulator executing `/v1/routing/simulate` without consuming API keys or token budgets. Previews multi-factor candidate scoring, candidate factor rankings (`quality`, `cost`, `speed`, `health`), and policy evaluation matrices, with 1-click transition to live `/sandbox`.
- **Active Model Router Activity Sidebar Widget**: Real-time status indicator (`ModelActivityWidget.tsx`) in the Admin Console Sidebar footer displaying online `prism-auto` model router status and active provider count.
- **Strict Developer Guidelines & Compiler Code Hygiene**: Repository rules enforcing zero `any` policy (`@typescript-eslint/no-explicit-any`), concrete JSON primitive types (`JsonValue`, `JsonObject`) over loose `unknown`, prohibition of empty `catch` blocks (`no-empty`), compiler-enforced unused imports & locals policy (`"noUnusedLocals": true`, `"noUnusedParameters": true` in `tsconfig.json`), and mandatory typechecked production builds (`pnpm build`).

---

## Monorepo & Technology Stack

- **Monorepo Structure**:
  - `apps/api`: High-performance Go 1.25 API Proxy Engine & Middleware
  - `apps/app`: Next.js 15 Admin Console & Control Dashboard
  - `apps/web`: Responsive Astro 5.0 Marketing Landing Page
- **Database**: PostgreSQL 15 (Single Source of Truth, Migrations 001–061)
- **Cache & State Store**: Redis 7 (Rate Limiting, Cooldown, Tenant Keyspaces)
- **CI/CD**: GitHub Actions (Linting, Automated Testing, GHCR Container Registry, Automated VPS Deployment)

---

## Quick Start Guide

### 1. Prerequisites
- [Docker & Docker Compose](https://docs.docker.com/get-docker/) installed on your system.
- [Go 1.25+](https://go.dev/dl/) & [pnpm 9+](https://pnpm.io/) (if running locally without Docker).

### 2. Client Setup Example (OpenCode CLI)

Add Prism to your `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "provider": "prism",
  "api_url": "https://api.prism.roozylabs.com",
  "api_key": "gw_sk_prism_8f9a2b1c...",
  "model": "prism-auto", // Smart Router selects the best model dynamically!
  "headers": {
    "X-Prism-Agent-ID": "opencode-cli-agent"
  }
}
```

### 3. Running via Docker Compose

```bash
git clone https://github.com/roozylabs/prism.git
cd prism
cp .env.example .env
docker compose up -d --build
```

The application stack will be available at:
- **Prism Landing Page**: `http://localhost:3001`
- **Admin Console Dashboard**: `http://localhost:3000`
- **Prism Gateway API**: `http://localhost:8080`

---

## API Endpoints Summary

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| **Health & Auth** | | | |
| `GET` | `/health` | Healthcheck API, DB, & Redis status | Public |
| `POST` | `/api/auth/login` | User Login | Public |
| `GET` | `/api/auth/me` | Current session user | Session |
| **Tenants, Auth & RBAC** | | | |
| `GET` | `/api/auth/oauth/:provider` | Initiate OAuth2 Login (Google / GitHub) | Public |
| `GET` | `/api/user/permissions` | Get user active permissions & role matrix | Session |
| `POST` | `/api/onboarding` | 3-step onboarding wizard workspace setup | Session |
| `GET` | `/api/organizations` | List organizations | Session |
| `GET` | `/api/workspaces` | List workspaces | Session |
| `GET` | `/api/projects` | List projects | Session |
| `GET` | `/api/settings/members` | List organization RBAC members | Session |
| **MCP Registry & Agent Templates** | | | |
| `GET` | `/v1/mcp/registry` | List verified & public MCP servers | Gateway / Session |
| `POST` | `/v1/mcp/registry` | Register custom MCP server in registry | Session |
| `GET` | `/v1/agent-templates` | List pre-configured agent role templates | Gateway / Session |
| `POST` | `/v1/agent-templates/:id/instantiate` | 1-Click Agent Instantiation | Session |
| **Audit Trail & Exporter** | | | |
| `GET` | `/v1/audit-trail/logs` | Query system action logs | Session |
| `GET` | `/v1/audit-trail/export` | Download CSV/JSON compliance reports | Session |
| **Quotas & Budgets** | | | |
| `GET` | `/v1/quotas` | List organization and workspace tenant quotas | Session |
| `PUT` | `/v1/quotas/:target_type/:target_id` | Update target quota spend and request limits | Session |
| **Multi-Tier Billing** | | | |
| `GET` | `/v1/billing/plans` | List public subscription plans & markup rates | Session |
| `GET` | `/v1/billing/subscription` | Active organization subscription & spend | Session |
| `POST` | `/v1/billing/subscription/upgrade` | Upgrade subscription tier | Session |
| `GET` | `/v1/billing/invoices` | List organization invoice receipts | Session |
| **Gateway (OpenAI-Compatible)** | | | |
| `GET` | `/v1/models` | List active models (including `prism-auto`) | Gateway Key |
| `POST` | `/v1/chat/completions` | Inference API (Smart Router `prism-auto`, Streaming, Retry) | Gateway Key |

---

## License

Distributed under the [MIT License](LICENSE).
