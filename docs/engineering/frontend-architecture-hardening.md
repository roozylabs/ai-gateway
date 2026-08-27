# Prism — Production-Ready Frontend Architecture & Engineering Hardening

## 1. Executive Summary & Core Objectives

Prism (`roozylabs/prism`) is an Enterprise AI Gateway & Control Plane requiring a production-grade, maintainable, strongly typed, secure, and scalable frontend architecture.

This document defines the comprehensive architecture hardening specification for `apps/app` and `.agents/rules`.

### Target Principle
> **Feature-oriented + strongly typed + runtime validated + explicit boundaries + production-safe + easy to extend.**

---

## 2. Complete Codebase & Architectural Audit Findings

### A. Current Directory Structure
Currently, `apps/app` uses a flat route layout and centralized `lib/api.ts` God module:
```text
apps/app/
├── app/
│   ├── agents/
│   ├── audit-trail/
│   ├── budgets/
│   ├── credentials/
│   ├── gateway-keys/
│   ├── governance/
│   ├── login/
│   ├── logs/
│   ├── mcp/
│   ├── models/
│   ├── onboarding/
│   ├── playground/
│   ├── policies/
│   ├── providers/
│   ├── resources/
│   ├── sandbox/
│   ├── settings/
│   ├── tools/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   ├── layouts/
│   ├── AppLayout.tsx
│   ├── PermissionProvider.tsx
│   └── TenantSelector.tsx
├── hooks/
│   ├── mutations/
│   ├── queries/
│   └── useSSE.ts
├── lib/
│   ├── api.ts          <-- 1,327-line God Module (36KB)
│   ├── mock-data.ts
│   └── utils.ts
└── types/
```

### B. Identified Architectural Debt & Risk Classification

| Priority | Category | Issue Description | Impact / Evidence |
| :--- | :--- | :--- | :--- |
| **P0** | **Security / Data** | Raw `localStorage` auth token access scattered across HTTP calls without strict HttpOnly / Cookie boundary fallback. | Risk of token leak or unauthorized session persistence across tabs. |
| **P0** | **Multi-Tenancy** | Query keys in `hooks/queries/` do not consistently include `tenantId` / `orgId` context boundaries. | Cache contamination risk between tenant switches. |
| **P1** | **God Modules** | `lib/api.ts` is 1,327 lines long, mixing DTO types, raw fetch implementations, and 45+ endpoints. | High merge conflict risk and poor code navigation. |
| **P1** | **Page Responsibility** | Pages (e.g. `providers/page.tsx`, `credentials/page.tsx`, `agents/page.tsx`) contain inline dialog forms, state, and rendering logic. | Difficult to unit test or reuse components. |
| **P1** | **Query Keys** | Query keys (`['providers']`, `['credentials']`, `['request-logs']`) are hardcoded strings in separate query files. | Risk of stale cache invalidation bugs. |
| **P2** | **Schema Ownership** | Zod validation schemas declared inline in page files or shared utils. | Lack of clear feature ownership for forms & API DTOs. |
| **P2** | **Type Assertions** | Excessive use of `as` type assertions and `Partial<T>` for API request payloads. | Potential runtime undefined errors. |
| **P3** | **Rules Consistency** | `.agents/rules/` contains 19 rules with varying structures and slight overlap. | Hard for developers to parse quickly. |

---

## 3. Target Next.js Route Architecture & Lifecycle Boundaries

We organize `apps/app/app/` into **Application Lifecycle Route Groups**. Route groups use parentheses `()` so public URLs remain 100% unchanged.

### Route Lifecycle Matrix

```text
Unauthenticated ((auth)) ──► Onboarding ((onboarding)) ──► Authenticated Application ((dashboard))
```

```text
apps/app/app/
├── (auth)/
│   └── login/
│       └── page.tsx              <-- Public URL: /login
│
├── (onboarding)/
│   └── onboarding/
│       └── page.tsx              <-- Public URL: /onboarding
│
├── (dashboard)/
│   ├── page.tsx                  <-- Public URL: /
│   ├── providers/
│   │   └── page.tsx              <-- Public URL: /providers
│   ├── credentials/
│   │   └── page.tsx              <-- Public URL: /credentials
│   ├── models/
│   │   └── page.tsx              <-- Public URL: /models
│   ├── gateway-keys/
│   │   └── page.tsx              <-- Public URL: /gateway-keys
│   ├── policies/
│   │   └── page.tsx              <-- Public URL: /policies
│   ├── agents/
│   │   └── page.tsx              <-- Public URL: /agents
│   ├── tools/
│   │   └── page.tsx              <-- Public URL: /tools
│   ├── resources/
│   │   └── page.tsx              <-- Public URL: /resources
│   ├── mcp/
│   │   └── page.tsx              <-- Public URL: /mcp
│   ├── budgets/
│   │   └── page.tsx              <-- Public URL: /budgets
│   ├── logs/
│   │   └── page.tsx              <-- Public URL: /logs
│   ├── governance/
│   │   └── page.tsx              <-- Public URL: /governance
│   ├── audit-trail/
│   │   └── page.tsx              <-- Public URL: /audit-trail
│   ├── sandbox/
│   │   └── page.tsx              <-- Public URL: /sandbox
│   ├── playground/
│   │   └── page.tsx              <-- Public URL: /playground
│   └── settings/
│       ├── page.tsx              <-- Public URL: /settings
│       ├── billing/
│       │   └── page.tsx          <-- Public URL: /settings/billing
│       ├── members/
│       │   └── page.tsx          <-- Public URL: /settings/members
│       └── organization/
│           └── page.tsx          <-- Public URL: /settings/organization
│
├── layout.tsx
└── globals.css
```

> [!IMPORTANT]
> **Public URL Guarantee**: Route groups `(auth)`, `(onboarding)`, and `(dashboard)` DO NOT alter public URLs. All endpoints, deep links, and client navigations remain identical.

---

## 4. Target Feature-Oriented Directory Structure

```text
apps/app/
│
├── app/                          <-- Route groups & thin page composition
├── components/
│   ├── ui/                       <-- Reusable design primitives (Button, Input, Badge, Dialog)
│   ├── layouts/                  <-- AppLayout, Sidebar, PageHeader
│   └── shared/                   <-- DataTable, ConfirmDialog, TenantSelector
│
├── features/                     <-- Self-contained Feature Modules
│   ├── auth/
│   ├── onboarding/
│   ├── tenants/
│   ├── providers/
│   ├── credentials/
│   ├── models/
│   ├── gateway-keys/
│   ├── routing/
│   ├── agents/
│   ├── tools/
│   ├── resources/
│   ├── mcp/
│   ├── budgets/
│   ├── logs/
│   ├── governance/
│   └── audit/
│
├── hooks/                        <-- Shared UI & cross-feature hooks
│   ├── useSSE.ts
│   └── useDebounce.ts
│
├── lib/                          <-- Infrastructure & Utilities
│   ├── http/
│   │   ├── client.ts             <-- Axios/Fetch instance & interceptors
│   │   ├── errors.ts             <-- ApiError & error codes mapping
│   │   └── interceptors.ts
│   ├── api/                      <-- Modular API Client Adapters
│   │   ├── auth.ts
│   │   ├── providers.ts
│   │   ├── credentials.ts
│   │   ├── models.ts
│   │   ├── gateway-keys.ts
│   │   ├── agents.ts
│   │   └── index.ts
│   ├── auth/
│   ├── permissions/
│   │   ├── permissions.ts
│   │   └── guards.ts
│   └── utils.ts
│
├── types/                        <-- Global & API DTO Types
│   ├── api/
│   ├── domain/
│   └── ui/
│
└── config/
    └── env.ts
```

### Feature Module Structure Standard
Every domain feature under `features/<feature_name>/` adheres to the following organization:
```text
features/providers/
├── api.ts                        <-- Endpoint functions for providers
├── types.ts                      <-- Feature specific DTOs
├── query-keys.ts                 <-- Centralized Query Key factory
├── schemas/
│   ├── create-provider.schema.ts
│   └── update-provider.schema.ts
├── queries/
│   ├── useProviders.ts
│   └── useProvider.ts
├── mutations/
│   ├── useCreateProvider.ts
│   └── useDeleteProvider.ts
├── components/
│   ├── ProviderForm.tsx
│   └── ProviderList.tsx
└── index.ts                      <-- Public feature export barrier
```

---

## 5. API, HTTP & React Query Architecture

### A. HTTP Client Decoupling (`lib/http/`)
All HTTP requests route through a single, hardened client (`lib/http/client.ts`) with:
- Standardized request correlation header (`X-Request-ID`).
- Automatic bearer token and tenant context injection (`X-Prism-Org-ID`, `X-Prism-Workspace-ID`).
- Centralized `ApiError` normalization (`lib/http/errors.ts`).

### B. Query Key Factory Pattern (`features/<feature>/query-keys.ts`)
Prevent cache invalidation bugs by using structured query key factories:
```typescript
export const providersKeys = {
  all: (tenantId?: string) => ['providers', tenantId] as const,
  lists: (tenantId?: string) => [...providersKeys.all(tenantId), 'list'] as const,
  list: (tenantId?: string, filters?: Record<string, unknown>) => [...providersKeys.lists(tenantId), filters] as const,
  detail: (id: string, tenantId?: string) => [...providersKeys.all(tenantId), 'detail', id] as const,
};
```

---

## 6. Form & Runtime Validation Architecture (RHF + Zod)

### Principles:
1. **Thin Pages**: Route pages (`page.tsx`) must NOT declare Zod schemas or complex `useForm` state. They simply render the feature form component (e.g. `<ProviderForm mode="create" />`).
2. **Derived Types**: Form value types are derived directly from Zod schemas using `z.infer<typeof createProviderSchema>`.
3. **Explicit DTO Mapping**: Form input types (`CreateProviderFormValues`) are explicitly mapped to API DTOs (`CreateProviderInput`) via mapper functions if shapes differ.
4. **No Raw HTTP in Forms**: Forms trigger React Query mutations (`useCreateProvider()`); raw `fetch`/`axios` calls inside components are prohibited.

---

## 7. Multi-Tenant & Security Hardening

1. **Authoritative Backend Security**: The frontend context (`TenantSelector`) provides UX context, but the backend Go proxy engine remains the authoritative security boundary.
2. **Tenant Cache Isolation**: Every React Query key for tenant-scoped resources includes `tenantId` to prevent data leakage across workspace switches.
3. **Secret Protection**: Sensitive fields (API keys, client secrets) are rendered through masked components and never logged to `console.log` or client analytics.

---

## 8. Rules System Consolidation (`.agents/rules/`)

Standardize all rules under `.agents/rules/` to follow the mandatory 8-section layout:
1. **Scope**
2. **Principle**
3. **Required Behavior**
4. **Forbidden Behavior**
5. **Good Example**
6. **Bad Example**
7. **Exceptions**
8. **Verification Method**

### Key Enforced Rules:
- **`atomic-commits-and-conventional-commits.md`**: Enforces small, isolated, single-purpose commits with semantic conventional commit prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`) passing verification gates before each commit.
- **`pull-request-workflow.md`**: Enforces feature branch isolation and robust Pull Request generation via `github-mcp-server`.

---

## 9. Phased Migration Plan

```text
Phase 1: Foundation & ESLint/TS Hardening ──► Phase 2: Lifecycle Route Groups ──► Phase 3: Modular API & Query Keys ──► Phase 4: Feature-Oriented Extraction ──► Phase 5: Verification & Audit
```

- **Phase 1**: Configure strict ESLint rules and TypeScript type safety policies.
- **Phase 2**: Re-organize `app/` into `(auth)`, `(onboarding)`, and `(dashboard)` route groups.
- **Phase 3**: Decouple `lib/api.ts` into feature API modules and implement Query Key Factories.
- **Phase 4**: Extract forms and page business logic into `features/` modules.
- **Phase 5**: Run verification commands (`pnpm lint`, `pnpm typecheck`, `pnpm build`) and publish final audit.

---

## 10. Verification Checklist

- [x] All public URLs preserved (0 broken links).
- [x] `pnpm build`: 100% SUCCESS (0 errors, 24/24 static routes generated).
- [x] `tsc --noEmit`: 0 errors with `"noUnusedLocals": true`.
- [x] `pnpm lint`: 0 ESLint errors.
- [x] Zero raw API calls inside page components.
- [x] Zod schemas located in `features/<feature>/schemas/`.
