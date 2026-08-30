# RoozyLabs Prism — Comprehensive Authorization & Multi-Tenant Security Audit

## 1. Executive Summary

This audit represents an exhaustive, codebase-wide examination of RoozyLabs Prism (v2.2.0), covering authentication boundaries, RBAC resolution, multi-tenant database queries, gateway proxy engine, MCP execution, API key scoping, and sensitive operational flows.

---

## 2. Inventory of Audit Findings

| Severity | ID | Category | Vulnerability / Issue Description | Affected Files | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **CRITICAL** | `SEC-001` | Fail-Open RBAC | RBAC repository and handler fallback to `developer` / `viewer` upon query or database error instead of failing closed. | `internal/repository/rbac.go`<br>`internal/handlers/user_permissions.go` | **REMEDIATING** |
| **CRITICAL** | `SEC-002` | Tenant Bypass | `org_default` fallback allows unauthenticated or cross-tenant actors to view or modify default tenant resources. | `internal/middleware/tenant.go`<br>`internal/handlers/quota.go` | **REMEDIATING** |
| **CRITICAL** | `SEC-003` | Hardcoded User Bypass | Repositories query `OR user_id = 'user_admin' OR user_id = ''`, granting unauthorized access across users. | `internal/repository/agent.go`<br>`internal/repository/credential.go`<br>`internal/repository/gateway_key.go`<br>`internal/repository/mcp_server.go`<br>`internal/repository/provider.go`<br>`internal/repository/tool.go` | **REMEDIATING** |
| **HIGH** | `SEC-004` | IDOR / BOLA | CRUD repositories (Gateway Keys, Agents, MCP Servers, Tools, Budgets) filter solely by `user_id` without validating `organization_id` ownership. | `internal/repository/gateway_key.go`<br>`internal/repository/agent.go`<br>`internal/repository/mcp_server.go`<br>`internal/repository/budget.go` | **REMEDIATING** |
| **HIGH** | `SEC-005` | Missing Endpoint RBAC | Sensitive management endpoints (Billing, Quotas, Settings, Credentials, Gateway Keys) lack explicit action permission checks. | `internal/handlers/billing.go`<br>`internal/handlers/quota.go`<br>`internal/handlers/settings.go`<br>`internal/handlers/credential.go` | **REMEDIATING** |
| **HIGH** | `SEC-006` | Last-Owner Invariant | Missing validation preventing the removal or demotion of an organization's sole remaining owner. | `internal/repository/rbac.go`<br>`internal/handlers/organization_members.go` | **REMEDIATING** |
| **MEDIUM** | `SEC-007` | Missing Workspace RBAC | Workspaces lack explicit membership table (`workspace_members`), leaving multi-workspace isolation implicit. | `migrations/077_*.sql`<br>`internal/repository/rbac.go` | **REMEDIATING** |
| **MEDIUM** | `SEC-008` | Audit Attribution | Sensitive member updates, policy modifications, and key revocations do not emit structured audit events. | `internal/handlers/organization_members.go`<br>`internal/handlers/gateway_key.go` | **REMEDIATING** |

---

## 3. Detailed Technical Analysis

### 3.1. Fail-Open RBAC Analysis (`SEC-001`)
In `internal/repository/rbac.go`:
```go
// VULNERABLE CODE (Legacy)
if err != nil {
    return []string{"org:read", "logs:read"}, "viewer", nil
}
if roleSlug == "" {
    roleSlug = "developer"
    permissions = []string{"org:read", "api_keys:*", "playground:execute", "logs:read"}
}
```
**Risk**: If PostgreSQL experiences temporary network latency, connection pool exhaustion, or a user record is missing, the user is granted `developer` privileges and given active access to API keys and logs.
**Remediation**: Return explicit error and deny all access (`ALLOW = false`).

### 3.2. Special Tenant Bypass (`SEC-002`)
In `internal/middleware/tenant.go` and `internal/handlers/quota.go`:
```go
// VULNERABLE CODE (Legacy)
if targetType == "organization" && orgID != "" && targetID != orgID && orgID != "org_default" {
    c.JSON(http.StatusForbidden, gin.H{"error": "cannot update quota for a different organization"})
    return
}
```
**Risk**: Any client claiming `org_default` as tenant context bypasses tenant checks and can alter quotas for arbitrary organizations.
**Remediation**: Eliminate special-case bypasses; enforce strict membership check against target organization.

### 3.3. Hardcoded User String Bypass (`SEC-003`)
In multiple CRUD repositories:
```go
// VULNERABLE CODE (Legacy)
WHERE id = $1 AND (user_id = $2 OR user_id = 'user_admin' OR user_id = '')
```
**Risk**: Bypasses ownership verification if `user_admin` is passed or if resources have empty `user_id`.
**Remediation**: Remove `user_admin` checks completely and require exact parameterized `(organization_id = $1)` scoping.

---

## 4. Remediation Plan

1. Create Migration `077_harden_authorization_and_workspace_members.up.sql`.
2. Build central `authz.AuthorizationEngine` evaluating hierarchical permissions.
3. Refactor all repositories to require explicit `org_id` parameters.
4. Add `organization_members` REST handlers with last-owner protection.
5. Create complete security regression test suite in `internal/security/comprehensive_authz_test.go`.
