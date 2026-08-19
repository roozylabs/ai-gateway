# AI Gateway Technical Debt

## Revision History

| Version | Date & Time | Description of Changes |
| :--- | :--- | :--- |
| 1.0 | 19 August 2026, 10:59 WIB | Initial creation of Tech Debt document for missing API endpoints |

This document tracks known technical debt, missing features, and pending implementations in the AI Gateway project, specifically comparing the implemented Go backend API with the Next.js frontend requirements and architectural specifications.

## 1. Missing API Endpoints (Backend vs Frontend Gap Analysis)

Based on the current frontend pages (`@app`) and the specifications in `docs/PRD-AI-Gateway.md` and `docs/ARCHITECTURE.md`, the following backend API endpoints are designed/required but not yet implemented in `api/cmd/server/main.go`.

### 1.1 Real-Time Events (SSE)
*   **Endpoint**: `GET /api/v1/sse`
*   **Status**: Missing
*   **Required by**: All dashboard pages (Providers, Credentials, Dashboard, Logs)
*   **Description**: The centralized Server-Sent Events endpoint for pushing real-time updates (health status, rate limits, request logs) to the frontend via Redis Pub/Sub, as defined in ARCHITECTURE.md Section 14.

### 1.2 Dashboard Metrics & Charts
*   **Endpoints**: `GET /api/dashboard/metrics`, `GET /api/dashboard/chart` (or combined)
*   **Status**: Missing
*   **Required by**: `DashboardPage` (`app/app/page.tsx`)
*   **Description**: Aggregated statistics for total requests, tokens, average latency, and time-series data for the model usage chart. Currently, the dashboard likely relies on mock data or lacks these feeds.

### 1.3 Request Logs (Historical & Live)
*   **Endpoint**: `GET /api/logs`
*   **Status**: Missing
*   **Required by**: `LogsPage` (`app/app/logs/page.tsx`), `DashboardPage` (Recent Activity)
*   **Description**: Endpoint to fetch paginated historical request logs. While the SSE endpoint provides a live tail, a REST endpoint is needed for initial load and historical querying.

### 1.4 Credential Testing
*   **Endpoint**: `POST /api/providers/:id/credentials/:credId/test`
*   **Status**: Missing
*   **Required by**: `CredentialsPage`
*   **Description**: Explicitly listed in `ARCHITECTURE.md` (Section 13) to allow admins to test if an API key is valid before enabling it.

### 1.5 Global Routing Rules (Models)
*   **Endpoint**: `GET /api/routing-rules` or global `GET /api/models`
*   **Status**: Partially Missing / Needs Adjustment
*   **Required by**: `ModelsPage` (`app/app/models/page.tsx`)
*   **Description**: The current backend implements nested model routes (`/api/providers/:id/models`). However, the `ModelsPage` UI presents a global routing table mapping aliases to upstream providers. A global endpoint to manage these routing rules independently of a single provider might be necessary.

### 1.6 Settings & Configuration
*   **Endpoint**: `GET/PUT /api/settings`
*   **Status**: Missing
*   **Required by**: `SettingsPage` (`app/app/settings/page.tsx`)
*   **Description**: Endpoints to manage global gateway configurations, security settings, or user preferences.

## 2. Next Steps for Backend Team

1.  **Prioritize SSE Implementation**: Implement `GET /api/v1/sse` and the Redis Pub/Sub integration to unblock real-time UI features.
2.  **Implement Dashboard Endpoints**: Create the aggregation queries in the repository layer to power the dashboard metrics and charts.
3.  **Implement Log Retrieval**: Create the `GET /api/logs` endpoint with pagination and filtering.
4.  **Implement Credential Testing**: Add the `test` endpoint that makes a minimal probe request to the target provider to verify the key.
