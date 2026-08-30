# Frontend Architecture Audit: `apps/app` (RoozyLabs Prism v2.2.0)

This document contains a production-grade architecture audit of the frontend application under `apps/app` in the `roozylabs/prism` repository.

---

## 1. Current Architecture

### 1.1 Directory & Tech Stack
- **Framework:** Next.js 16.3.3 (App Router, standalone output mode)
- **UI & State:** React 19.2.0, Tailwind CSS v3.4, Radix UI primitives, `@tanstack/react-query` v5.66, `zustand` v5.0
- **Forms & Validation:** `react-hook-form` v7.54, `zod` v3.24, `@hookform/resolvers`
- **Networking & Real-time:** `axios` v1.7, `js-cookie` v3.0, browser native `EventSource` (SSE)

```
apps/app/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── page.tsx (Overview)
│   │   ├── agents/
│   │   ├── audit-trail/
│   │   ├── budgets/
│   │   ├── credentials/
│   │   ├── gateway-keys/
│   │   ├── governance/
│   │   ├── logs/
│   │   ├── mcp/ & mcp/[id]/
│   │   ├── models/
│   │   ├── playground/
│   │   ├── policies/
│   │   ├── providers/
│   │   ├── resources/
│   │   ├── sandbox/
│   │   ├── settings/ (billing, members, organization)
│   │   └── tools/
│   ├── (onboarding)/onboarding/
│   ├── api/[[...path]]/ (Next.js reverse proxy to Go backend API)
│   └── v1/[[...path]]/ (Next.js reverse proxy to Go inference engine)
├── components/
│   ├── atoms/ (Badge, Button, Input, StatusTag, Slider, Switch, Tooltip...)
│   ├── molecules/ (Card, Dialog, Sheet, ConfirmDialog, Form, MultiSelect, MetricCard...)
│   ├── organisms/ (DataTable, ChartContainer)
│   └── layouts/ (AppLayout, AuthLayout, QueryProvider, ThemeProvider)
├── context/ (AuthContext, SSEContext, QueryProvider, ThemeContext)
├── features/ (Domain query-keys and Zod schemas)
├── hooks/
│   ├── queries/ (20 domain query hooks)
│   ├── mutations/ (6 mutation hooks + inline duplicate mutation hooks)
│   └── useSSE.ts
├── lib/
│   ├── api.ts (1,390 lines monolithic API client & interfaces)
│   ├── mock-data.ts (legacy static mock data)
│   ├── utils.ts
│   └── http/ (client.ts, errors.ts)
├── stores/ (usePlaygroundStore, useSidebarStore, useSystemStore, useTenantStore)
└── types/ (roles.ts, ui.ts)
```

### 1.2 Route & Security Boundaries
- **Route Protection:** Next.js `middleware.ts` checks for cookie `auth_token`. If absent and accessing a dashboard page, redirects to `/login`.
- **API & V1 Proxies:** `app/api/[[...path]]/route.ts` and `app/v1/[[...path]]/route.ts` forward client requests to the Go backend (`http://localhost:8080`), injecting `Authorization: Bearer <token>` from the cookie.
- **Client-Side Rendering:** All 23 page files declare `'use client'` to support interactive React state, React Hook Form modals, Recharts, and SSE listeners.

---

## 2. Comprehensive Findings

| ID | Severity | File/Path | Current Behavior | Why Problematic | Recommended Solution | Migration Risk | Backend Changes |
|---|---|---|---|---|---|---|---|
| **S-01** | **P0** | `context/AuthContext.tsx`, `handlers/auth.go` | `auth_token` stored in client-accessible cookie without `HttpOnly` / `Secure` flags | Token can be accessed by client JS / XSS vectors. | Backend `/api/auth/login` sets `HttpOnly; SameSite=Lax; Path=/` cookie. Frontend Axios interceptor & proxy handle seamless forwarding. | Low | Yes (enhanced `/auth/login` and `/auth/logout` response headers) |
| **S-02** | **P0** | `app/(dashboard)/page.tsx:174` | Hardcoded `0.667 / 0.333` multipliers used to calculate input/output token split | Fabricates domain metrics in UI without real data. | Display total tokens accurately without synthetic calculations. | None | None |
| **S-03** | **P0** | `app/(dashboard)/page.tsx`, `useDashboardQuery.ts` | Date range selector (`'24h'`, `'7d'`, `'30d'`, `'90d'`) state is disconnected from React Query hooks | Selecting date range does not update stats or usage charts. | Pass `dateRange` parameter to `useDashboardStatsQuery` & `useUsageChartQuery` with dynamic query keys. | Low | None |
| **S-04** | **P0** | `context/SSEContext.tsx:90` | SSE invalidates query key `['logs']` instead of `['request-logs']` | Incoming log events fail to refresh the logs view. | Align SSE invalidation key with `useLogsQuery` key (`['request-logs']`). | None | None |
| **A-01** | **P1** | `lib/api.ts` | Monolithic 1,390-line file containing 68 interfaces and 93 exported API functions | High coupling, difficult maintenance, merge conflicts. | Refactor into domain modules under `lib/api/` with typed re-exports in `lib/api/index.ts`. | Low (backwards-compatible re-exports) | None |
| **A-02** | **P1** | `features/*/query-keys.ts`, `hooks/queries/` | Query key factories defined in `features/*/query-keys.ts` are bypassed by string literals | Duplication and risk of subtle typo bugs across query hooks. | Standardize all query hooks to consume domain query key factories. | Low | None |
| **A-03** | **P1** | `hooks/queries/` vs `hooks/mutations/` | Duplicate mutation hooks declared across both query and mutation files | Inconsistent signatures and cache invalidation strategies. | Move all mutations strictly into `hooks/mutations/` and keep `hooks/queries/` dedicated to queries. | Low | None |
| **A-04** | **P1** | `features/*/schemas/` vs `_components/*FormDialog.tsx` | Zod validation schemas duplicated between domain folders and form dialogs | Schemas drift out of sync over time. | Centralize schemas in `features/*/schemas/` and infer TypeScript types via `z.infer`. | Low | None |
| **A-05** | **P1** | `context/SSEContext.tsx` | Blanket invalidation of 7 unrelated queries on every SSE event | Causes request storms on high-throughput gateways. | Implement semantic event dispatching mapping specific SSE event types to targeted query keys. | Medium | None |
| **A-06** | **P1** | `context/QueryProvider.tsx` | Duplicate unreferenced `QueryProvider` file | Dead code and confusion. | Remove duplicate `context/QueryProvider.tsx` in favor of `components/layouts/QueryProvider.tsx`. | None | None |
| **A-07** | **P1** | `lib/mock-data.ts` | 300+ lines of unused static mock fixtures | Dead code in production bundle. | Safely remove `lib/mock-data.ts`. | None | None |
| **A-08** | **P1** | `components/TenantSelector.tsx` | Hardcoded mock organizations (`Default Organization`, `RoozyLabs Dev`) | Fails to reflect actual user tenant boundaries from API. | Wire `TenantSelector` to `apiGetOrganizations` or `apiGetUserPermissions`. | Low | Supported via `/api/user/organizations` |
| **S-06** | **P1** | `lib/http/client.ts`, `sandbox/page.tsx` | Scattered `localStorage.getItem('token')` and `localStorage.getItem('access_token')` | Multi-token storage confusion. | Consolidate all auth onto the unified Axios API client and cookie token flow. | Low | None |
| **T-01** | **P2** | 18 files across `apps/app` | 18 occurrences of `any` type | Violates zero-`any` rule. | Replace all `any` with `unknown`, `Record<string, unknown>`, or strict interfaces. | Low | None |
| **T-02** | **P2** | `lib/api/smart-router.ts` | `prism-auto` virtual model manually prepended in frontend model list | Domain model workaround exists in frontend. | Encapsulate into dedicated adapter with clear documentation. | None | None |
| **U-01** | **P2** | `app/(dashboard)/page.tsx` | Missing `ErrorState` handling for overview dashboard | Users see broken/blank view on API failures. | Add `ErrorState` with retry action. | None | None |
| **U-02** | **P2** | `app/(dashboard)/providers/page.tsx` | Missing loading skeleton | Content pops abruptly on initial load. | Add `CardSkeletonGrid` during loading. | None | None |
| **U-03** | **P2** | `app/(dashboard)/playground/page.tsx` | Simulation errors displayed only in transient toasts | Errors disappear without persistent context. | Add inline `ErrorState` feedback banner. | None | None |
| **U-04** | **P2** | `credentials/page.tsx`, `policies/page.tsx`, `billing/page.tsx` | Destructive or major tier mutations without confirmation dialogs | Risk of accidental state modifications. | Guard major actions with `ConfirmDialog`. | None | None |

---

## 3. Target Architecture

```
apps/app/
├── app/                  # Next.js App Router (pages & proxy routes)
├── components/
│   ├── atoms/            # Pure UI primitives
│   ├── molecules/        # Composed interactive components (Card, Dialog, Form, MetricCard)
│   ├── organisms/        # Complex data grids & charts (DataTable, ChartContainer)
│   └── layouts/          # Root application chrome (AppLayout, AuthLayout)
├── features/             # Feature domains (agents, auth, budgets, credentials, etc.)
│   └── [feature]/
│       ├── query-keys.ts # Centralized query key factories
│       ├── schemas/      # Single source of truth Zod schemas
│       └── types.ts      # Domain-specific UI models
├── hooks/
│   ├── queries/          # TanStack query hooks (strict useQuery only)
│   └── mutations/        # TanStack mutation hooks (strict useMutation only)
├── lib/
│   ├── api/              # Domain-oriented API client modules (auth, providers, models...)
│   │   ├── client.ts     # Axios instance & unified error interceptors
│   │   ├── types/        # Structured API payload & response types
│   │   └── index.ts      # Central re-export barrel
│   ├── errors/           # Normalized ApiError parser & error utilities
│   └── utils.ts          # Tailwind and string helpers
├── stores/               # Lightweight Zustand stores (transient UI state only)
└── types/                # Core shared enums & interfaces
```
