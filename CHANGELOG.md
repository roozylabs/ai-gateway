# Changelog

All notable changes to the **AI Gateway** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-08-21

### Added
- **Roozy Auto Smart Router (`roozy-auto`)**: Deterministic task classification (7 categories), request complexity heuristics, model capability registry scoring weights (Task, Quality, Cost, Speed), and weighted candidate scoring.
- **AI Budget Manager**: User-level monthly and daily expenditure limits, alert thresholds (`healthy`, `warning`, `critical`, `exceeded`), and automatic model downgrade logic before hard cutoffs.
- **Real-Time Cost Pipeline**: Automatic post-request calculation of `CostUSD` based on actual token usage and model pricing stored in `request_logs`.
- **Response Debugging Headers**: Injected `X-Roozy-Model`, `X-Roozy-Provider`, and `X-Request-ID` headers in all HTTP responses.
- **Complete Error Audit Logging**: Record failed and error requests (status 429, 500, 502, 504) into `request_logs` with sanitized error messages.
- **Pre-Filtered Ready Pool**: Instant zero-delay rotater excluding credentials undergoing 429 cooldown in Redis.
- **UI Guardrails**: Disabled deletion of default policy (`balanced`) and added explicit modal warnings for budget deletion.
- **API Endpoints**: `/api/policies`, `/api/budgets`, `/api/routing/decisions`.

### Fixed
- **React Audit Log Crash (Minified Error #31)**: Fixed primitive string serialization for NullString fields in routing decision logs.
- **`sqlrowserr` Linter Warning**: Added `rows.Err()` check after `rows.Next()` loop in `routing_decision.go`.

## [1.0.0] - 2026-08-19

### Added
- **Core Proxy Engine**: Multi-provider AI Integration (OpenAI, Anthropic, Google Gemini, OpenRouter, OpenCode).
- **Credential Rotation**: Round Robin, LRU, and Fallback Cascade rotation strategies.
- **Concurrency Limiting & Request Pacing**: Datacenter IP Cloudflare evasion semaphores.
- **Real-Time Dashboard & SSE**: Live event stream (`/api/v1/sse`), dashboard stats, charts, logs, and credential management.
- **OpenAI Compatible API**: `/v1/chat/completions` and `/v1/models`.
