# Changelog

All notable changes to the **AI Gateway** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-08-24

### Added
- **Resource Gateway (Pillar 8)**: Centralized data-layer abstraction supporting REST APIs, GraphQL, and PostgreSQL (Supabase) backends. Agents call generic data intents (`get_customer`) resolved to real data sources with priority-based failover, encrypted credentials, and read-only SQL enforcement. Admin CRUD UI with per-type configuration forms, gateway execution endpoint (`POST /v1/resources/:resourceName/query`), and audit logging.
- **Tool Gateway (Pillar 7)**: Provider-agnostic tool execution layer — register tools with input schemas and HTTP backends, gateway resolves and executes with automatic failover across priority-ordered backends. Admin CRUD UI, gateway execution endpoint (`POST /v1/tools/:toolName/execute`), full audit logging to `tool_invocations` table.
- **Statistical Spend Forecasting**: Weighted Moving Average (WMA) with trend analysis replaces simple velocity projection in FinOps summary. Displays trend direction (increasing/decreasing/stable) with percentage change.
- **P95 Latency Scoring**: Smart Router now uses 95th percentile TTFT instead of average for speed scoring — catches tail-latency spikes that averages miss.
- **Success-Rate Telemetry Tracking**: Redis telemetry now tracks per-model success rates; models with <95% success rate (≥10 samples) are penalized in scoring.
- **Historical Latency Flush Worker**: Hourly background worker flushes Redis telemetry aggregates into `model_latency_hourly` table for persistent trend analysis.
- **Payload Retention Cleanup Worker**: Hourly cleanup of `request_payloads` and `tool_invocations` tables older than 30 days to prevent unbounded growth.
- **Budget Alert Acknowledgment API**: `POST /analytics/finops/budget-alerts/:id/acknowledge` endpoint for managing budget alerts.
- **Audit Trail — Response Hash & Bytes**: Every proxied request now records SHA-256 response hash and byte count in `request_logs` for integrity verification and audit.
- **Audit Trail — Full Prompt Persistence**: Complete conversation payloads (all messages, JSONB) stored in new `request_payloads` table with prompt hash for integrity, capped at 256KB per request.
- **Audit Trail — Tool Invocation Logging**: All tool calls (function name, call ID, arguments) captured in `tool_invocations` table for both streaming and non-streaming paths.
- **Audit Trail — Failover History**: Failed credential attempts (429/401/403/5xx) recorded as JSONB `attempts` column on `request_logs`; `routing_decisions.actual_cost` backfilled after successful execution.
- **Provider Health Scoring**: Real-time composite health score (0.0–1.0) per provider computed from last 24h success rate + latency, cached 30s, integrated into Smart Router scoring with health_penalty trace notes.
- **Idempotency Key Support**: `Idempotency-Key` header on `/v1/chat/completions` enables 24h response replay for non-streaming requests and concurrency dedup via Redis locks.
- **Cost Anomaly Detection**: Hourly spend anomaly detection via z-score analysis with SSE alerts and REST endpoint.
- **Budget Threshold Alerts**: Automatic alert creation when budget usage crosses warning/critical/exceeded thresholds with daily dedup.

### Fixed
- **Stream Interruption Handling**: Mid-stream provider drops now emit graceful error event instead of abrupt disconnect.
- **Actual Cost Backfill**: `routing_decisions.actual_cost` field now correctly records post-execution cost instead of always being 0.

## [1.2.0] - 2026-08-23

### Added
- **Routing Simulation & Interactive Playground (Pillar 4)**: New `/playground` page with full routing simulation — enter a prompt, select policy and budget status, and see the complete Smart Router classification, candidate scoring breakdown, and model selection without executing a real request.
- **Behind-the-Scenes Pipeline Visualizer**: Step-by-step flow diagram in the Playground showing Request → Classification → Candidate Filtering → Weighted Scoring → Budget Downgrade → Final Model Selection.
- **Quick Prompt Presets**: One-click prompt templates for coding, reasoning, creative, and fast Q&A tasks to quickly test routing behavior.
- **FinOps Cost Recommendations Engine (Pillar 5)**: `GET /api/analytics/finops` endpoint computing daily spend velocity, projected monthly cost, budget exhaustion forecast, and model substitution savings recommendations.
- **Dynamic Latency Feedback Loop (Pillar 6)**: Redis-backed 15-minute rolling window storing last 50 latency samples per model (TTFT + total latency), feeding dynamic speed scoring penalties (TTFT > 1000ms) and bonuses (TTFT < 400ms) into the Smart Router candidate scorer.
- **Circuit Breaker & 50x Server Outage Quarantine**: Automatic credential quarantine after 3 consecutive 50x errors with 60-second cooldown, preventing repeated routing to failing upstream servers. Status exposed via SSE as `CREDENTIAL_QUARANTINED` event.
- **Provider Abstraction Layer**: Unified `ProviderAdapter` interface with dedicated adapters for OpenAI, Anthropic, Google Gemini, OpenAI Responses, and a meta-adapter for OpenCode that auto-detects sub-adapter by model prefix.
- **Web Sandbox Chat Interface**: `/sandbox` page providing an in-browser chat UI for testing Gateway API keys directly, with model selection and real-time streaming.

### Fixed
- **Duplicate `/analytics/logs` Route Registration**: Removed duplicate route causing Gin startup panic.
- **Analytics Response Unpacking**: Safely unpack `response.data` in `apiGetLogAnalytics` to prevent frontend crash on empty analytics data.
- **Strict Single Default Policy Enforcement**: Enforced `is_default` uniqueness across Create, Update, and SetDefault operations — only one routing policy can be active default at a time.

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
- **Smart Router Decision Details & Prompt Snippets**: Added migration `032_add_prompt_and_reasoning_to_routing_decisions.up.sql` (`prompt_preview` & `scores_breakdown` columns), extracted prompt preview snippets and scoring reasoning in `ResolveSemantic()`, and added `Details` action drawer in Next.js `LogsPage()` (`Smart Router Decisions` tab) to display request prompt text, candidate model scoring breakdown, and budget downgrade explanation.
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
