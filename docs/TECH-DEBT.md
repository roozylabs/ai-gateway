# AI Gateway Technical Debt & Roadmap Tracker

## Revision History

| Version | Date & Time | Description of Changes |
| :--- | :--- | :--- |
| 1.0 | 19 August 2026, 10:59 WIB | Initial creation of Tech Debt document for missing API endpoints |
| 1.1 | 21 August 2026, 22:56 WIB | Marked all V1 API gaps as Resolved and updated pending V2 architecture roadmap |

This document tracks resolved technical debt, current system health, and pending architectural enhancements for **AI Gateway**.

---

## 1. Resolved Technical Debt (V1 Implementation Complete)

All initial backend API gaps between the Next.js frontend and Go backend have been **fully resolved and deployed**:

| Item | Feature | Status | Implementation Details |
| :--- | :--- | :---: | :--- |
| **1.1** | Real-Time Events (SSE) | ✅ **Resolved** | `GET /api/v1/sse` with Redis Pub/Sub for live status, cooldown timers, request feed, and health updates. |
| **1.2** | Dashboard Metrics & Charts | ✅ **Resolved** | `GET /api/dashboard/stats`, `/chart`, and `/health` endpoints powering real-time usage charts and summary cards. |
| **1.3** | Request Logs & Audit Trail | ✅ **Resolved** | `GET /api/logs` (historical REST API) & `GET /api/routing/decisions` (Smart Router decision logs). |
| **1.4** | Credential Testing | ✅ **Resolved** | `POST /api/credentials/:id/test` for instant verification of provider API keys. |
| **1.5** | Routing Policies & Budgets | ✅ **Resolved** | `GET/POST/PUT/DELETE` endpoints for `/api/policies` and `/api/budgets`. |
| **1.6** | Real-Time Cost Pipeline | ✅ **Resolved** | Real-time `CostUSD` calculation per request based on input/output tokens and model pricing stored in `request_logs`. |
| **1.7** | Instant Failover (Ready Pool) | ✅ **Resolved** | Pre-filtering 429 rate-limited cooling credentials in Redis before strategy rotation (Round Robin/LRU/Fallback). |
| **1.8** | Error Sanitization & Headers | ✅ **Resolved** | Sanitized user-friendly error responses and `X-Prism-Model`, `X-Prism-Provider`, `X-Roozy-Model`, `X-Roozy-Provider`, `X-Request-ID` response headers. |

---

## 2. Pending Technical Debt & V2 Architectural Roadmap

The following items are planned for future optimization as traffic scales:

### 2.1 Dedicated `usage_events` Immutable Ledger
*   **Current State**: `request_logs` currently serves both request audit trailing and budget spend aggregation (`SUM(cost_usd)`).
*   **Future Enhancement**: Create an immutable `usage_events` table (Spec §24) and periodic aggregate rollups (`usage_aggregates_daily`) to keep analytical queries fast as request volume reaches millions.

### 2.2 Dynamic Provider Health Score in Weighted Scoring Formula
*   **Current State**: Credentials encountering HTTP 429 are excluded upfront via the Redis Cooldown Store (Pre-Filtered Ready Pool).
*   **Future Enhancement**: Incorporate a continuous health score variable ($0.0 \dots 1.0$) directly into `scorer.go` weighted sum equation so degraded providers seamlessly yield priority to healthier alternatives before hitting hard 429 errors.

### 2.3 Expanded Multi-Auth Type System (Enterprise Cloud Providers)
*   **Current State**: Standard API Keys (`api_key`) and Google OAuth 2.0 User Tokens (`gcp_user_oauth`) are supported.
*   **Future Enhancement**: Add AWS Bedrock SigV4 IAM signing (`aws_iam`), Azure AD Entra ID OAuth (`azure_oauth`), dan GCP Service Account JWT exchange (`gcp_service_account`) as outlined in Spec §8.1.

### 2.4 Multi-Tier Hierarchy Budgets (Project & Environment Scope)
*   **Current State**: Budgets operate at the User level (`monthly_limit`, `daily_limit`).
*   **Future Enhancement**: Support Organization → Project → Environment budget hierarchies (Spec §16–§17) with per-project API keys.
