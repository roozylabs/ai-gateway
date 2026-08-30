# RoozyLabs Prism — Authorization & RBAC Migration Plan

## 1. Migration Overview

This document outlines the zero-downtime migration strategy to upgrade RoozyLabs Prism to the hardened, fail-closed authorization architecture.

---

## 2. Phased Execution Roadmap

### Phase 1: Canonical Architecture & Model Alignment
- Define canonical model in `docs/AUTHORIZATION_MODEL.md`.
- Document all vulnerabilities and vectors in `docs/AUTHORIZATION_AUDIT.md`.
- Establish target `<resource>:<action>` permission catalog.

### Phase 2: Database Schema & Migration (077)
- Apply migration `077_harden_authorization_and_workspace_members.up.sql`:
  - Create `workspace_members` table.
  - Insert standardized permissions catalog into `permissions` table.
  - Backfill existing organizations with owner records in `organization_members`.
  - Add rollback script `077_harden_authorization_and_workspace_members.down.sql`.

### Phase 3: Central Authorization Engine (`internal/authz`)
- Implement `AuthorizationEngine` with deterministic `Can(ctx, principal, action, resource)`.
- Implement `RequirePermission` and `RequireOrgMembership` middleware.

### Phase 4: Repository Hardening & Zero-Bypass Enforcement
- Remove `user_admin` and `org_default` query conditions from:
  - `repository/agent.go`
  - `repository/credential.go`
  - `repository/gateway_key.go`
  - `repository/mcp_server.go`
  - `repository/provider.go`
  - `repository/tool.go`
  - `repository/resource.go`
  - `repository/budget.go`
  - `repository/governance_policy.go`
  - `repository/rbac.go`
- Enforce strict `WHERE organization_id = $x` scoping.

### Phase 5: Organization Member Management API
- Provide REST endpoints in `internal/handlers/organization_members.go`:
  - `GET /api/organizations/members`: List active team members and roles.
  - `POST /api/organizations/invites`: Send team invite.
  - `PUT /api/organizations/members/:userId`: Update member role with last-owner protection.
  - `DELETE /api/organizations/members/:userId`: Remove member with last-owner protection.

### Phase 6: Automated Security Regression Suite
- Add `internal/security/comprehensive_authz_test.go` covering 10 distinct security vectors.

---

## 3. Rollback Strategy

In the event of unexpected authorization regressions in staging or production:
1. Revert database migration with `077_harden_authorization_and_workspace_members.down.sql`.
2. Deploy previous application image tag.
3. Verify basic proxy and dashboard operations.
