# Changelog

All notable changes to the **AI Gateway** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-08-21

### Added
- **Global Gateway Keys Architecture (Hybrid Access Scope)**: Enabled default `provider_id = NULL` for Gateway API Keys, allowing a single API key to access all registered providers and the `roozy-auto` Smart Router without provider isolation restrictions.
- **Logs Observability & Analytics Hub**: Added `GET /api/analytics/logs` backend endpoint and interactive analytics dashboard in `LogsPage()`.
- **Smart Router Savings Estimator**: Calculates estimated cost savings vs flagship model baseline (`cost_usd` saved).
- **Client App & Model SLA Breakdown**: Visual breakdown of spend, token volume, average TTFT (Time to First Token), and latency across client apps (OpenCode, Claude Code, Antigravity) and models.
- **1-Click CSV Log Export**: Export filtered log data directly to downloadable `.csv` spreadsheet files.
- **Roozy Auto Smart Router (`roozy-auto`)**: Deterministic task classification (7 categories), request complexity heuristics, model capability registry scoring weights (Task, Quality, Cost, Speed), and weighted candidate scoring.
- **AI Budget Manager**: User-level monthly and daily expenditure limits, alert thresholds (`healthy`, `warning`, `critical`, `exceeded`), and automatic model downgrade logic before hard cutoffs.
- **Real-Time Cost Pipeline**: Automatic post-request calculation of `CostUSD` based on actual token usage and model pricing stored in `request_logs`.
- **Response Debugging Headers**: Injected `X-Roozy-Model`, `X-Roozy-Provider`, and `X-Request-ID` headers in all HTTP responses.
- **Complete Error Audit Logging**: Record failed and error requests (status 429, 500, 502, 504) into `request_logs` with sanitized error messages.
- **Pre-Filtered Ready Pool**: Instant zero-delay rotater excluding credentials undergoing 429 cooldown in Redis.
- **UI Guardrails**: Disabled deletion of default policy (`balanced`) and added explicit modal warnings for budget deletion.
- **API Endpoints**: `/api/policies`, `/api/budgets`, `/api/routing/decisions`, `/api/analytics/logs`.

### Added
- **Default Active Routing Policy Selection**: Added `is_default` column migration (`031_add_is_default_to_routing_policies.up.sql`), `SetDefault()` repository & handler endpoints (`PUT /policies/:id/default`), and `Set Active` action button in Next.js `PoliciesPage()` so users can switch which policy (`balanced`, `cheap`, `quality`, or custom) `roozy-auto` uses by default.

### Fixed
- **Routing Decision Logging**: Fixed `RequestID` logging bug in `logRoutingDecision()` (`engine.go`) where model slug `"roozy-auto"` was recorded instead of actual UUID request ID, and updated `Candidates` list to record all evaluated candidate models instead of single winning model.
- **Streaming Sandbox Global Key Model Resolution**: Fixed model resolution logic in `SandboxPage()` so selecting a Global Gateway Key dynamically combines models across all active providers and includes `roozy-auto` Smart Router in the Target Model Alias dropdown.
- **Automatic Credential Quota & Cooldown Reset**: Added `enrichCredentialQuota` backend logic and updated frontend `RateLimitQuotaBadge` so credentials automatically return to `Normal` (Active) status as soon as countdown timers / daily midnight reset finishes, eliminating manual API hit requirements.
- **VPS Deployment Error (`docker compose up -d --no-build`)**: Forced `--no-build` flag and added `docker system prune` in CI/CD workflows (`api-ci-cd.yml`, `app-ci-cd.yml`) to prevent VPS from building from source or failing due to containerd storage corruption.
- **React Audit Log Crash (Minified Error #31)**: Fixed primitive string serialization for NullString fields in routing decision logs.
- **`sqlrowserr` Linter Warning**: Added `rows.Err()` check after `rows.Next()` loop in `routing_decision.go`.

## [1.0.0] - 2026-08-19

### Added
- **Core Proxy Engine**: Multi-provider AI Integration (OpenAI, Anthropic, Google Gemini, OpenRouter, OpenCode).
- **Credential Rotation**: Round Robin, LRU, and Fallback Cascade rotation strategies.
- **Concurrency Limiting & Request Pacing**: Datacenter IP Cloudflare evasion semaphores.
- **Real-Time Dashboard & SSE**: Live event stream (`/api/v1/sse`), dashboard stats, charts, logs, and credential management.
- **OpenAI Compatible API**: `/v1/chat/completions` and `/v1/models`.
