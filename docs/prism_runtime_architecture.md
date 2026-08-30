# Prism Runtime Architecture & Control Plane Specification

> **Version:** 2.2.0  
> **Status:** Production Architecture Standard  
> **Target System:** RoozyLabs Prism AI Gateway (`apps/api`)

---

## Executive Overview

RoozyLabs Prism is an **Organizational AI Control Plane**. It governs, routes, executes, measures, and optimizes AI workloads across multi-tenant boundaries (Organizations, Workspaces, Projects, Users, Agents, Gateway API Keys, and Providers).

Rather than handling governance, rate-limiting, and routing ad-hoc within HTTP handlers, Prism enforces a **Single Authoritative Closed-Loop Pipeline** via `ExecutionOrchestrator` and `AdmissionController`.

---

## Canonical Gateway Request Lifecycle

```text
Incoming HTTP Request (POST /v1/chat/completions / SDK / CLI)
      │
      ▼
GatewayHandler (HTTP Adapter)
      │
      ▼
1. Authentication (GatewayAuthMiddleware -> GatewayAPIKey)
      │
      ▼
2. Authoritative Tenant Resolution (GatewayKey is Authoritative -> Header Narrowing Only)
      │
      ▼
3. Identity Resolution (AgentPolicyMiddleware -> User, Role, AgentID, AgentName)
      │
      ▼
4. AdmissionController.Evaluate(ctx, req)
   ├── a. RBAC Evaluation (GovernancePolicy -> Allow / Deny)
   ├── b. Agent Governance (AllowedModels, AllowedTools, MaxBudgetCents)
   ├── c. Tenant Quotas (Organization & Workspace Spend/Request Limits)
   └── d. Multi-Level Budget Policy (Org -> Workspace -> Project -> Agent -> Key)
      │
      ├─── [Result: DENY] ──> Abort -> Return HTTP 403/429 -> Record Denied Audit -> 0 Provider Work
      │
      └─── [Result: ALLOW / DOWNGRADE / WARN]
      │
      ▼
5. Task & Model Intelligence (Classifier -> TaskType -> Candidate Scorer)
      │
      ▼
6. Health-Aware Credential Selection (Router -> CredentialHealthPolicy -> Cooldown & Health Filter)
      │
      ▼
7. Provider Adapter Execution (OpenAI, Anthropic, Google, OpenCode)
      │
      ▼
8. Retry & Failover Loop (Exponential Backoff, Circuit Breaker Quarantine, Cooldown Trigger)
      │
      ▼
9. Telemetry & Cost Accounting (Tokens, Cost USD, TTFT, Latency)
      │
      ▼
10. Request Log Persistence (Tenant, Identity, Attempts Attribution -> request_logs)
      │
      ▼
11. Complete Audit Recording (SHA-256 Signature Chain + ExecutionTrace -> ai_audit_trails)
      │
      ▼
12. Credential & Provider Health Feedback Loop (Redis Pub/Sub SSE Notification)
```

---

## Security & Tenant Boundary Guarantees

### 1. Authoritative Organization Ownership
- The `GatewayAPIKey` is the **authoritative source** for organization ownership (`gatewayKey.OrgID`).
- Client-provided headers (`X-Prism-Org-ID`) can **never** elevate permissions or switch the organization context.
- If a client provides `X-Prism-Org-ID: victim_org` with a key belonging to `org_alpha`, the request is **immediately rejected with HTTP 403 Forbidden (`tenant_security_error`)**.

### 2. Scope Narrowing
- Client headers `X-Prism-Workspace-ID` and `X-Prism-Project-ID` are permitted **only to narrow scope** within the key's authorized organization.

---

## Governance & Admission Controller

The `AdmissionController` (`internal/proxy/admission.go`) executes BEFORE any provider request or model scoring occurs.

### Decision Pipeline
1. **RBAC Policy**: Glob-matched user/role/agent/model policies where `DENY` rules take absolute precedence over `ALLOW`.
2. **Agent Governance**: Validates model/tool access caps and `MaxBudgetCents` spend limits.
3. **Tenant Quotas**: Checks daily request limits and monthly spend limits for `organization` and `workspace` targets.
4. **Multi-Level Budget Policy**: Evaluates hard and soft budget limits. Hard limits return HTTP 429 Too Many Requests (`budget_exceeded_error`); soft limits trigger `AdmissionDowngrade` or `AdmissionWarn`.

---

## Health-Aware Credential Selection State Machine

Credential selection in `Router.selectByStrategy()` filters candidates based on `CredentialHealthPolicy`:

```text
Status: HEALTHY (Score >= 80.0) ──> Full Pool Priority
Status: DEGRADED (Score 40-79.0) ──> Demoted / Low Weight
Status: COOLDOWN / EXHAUSTED ──> Filtered Out of Selection
Status: DISABLED ──> Filtered Out of Selection
```

---

## Audit Event vs. Execution Trace

- **Audit Event (`ai_audit_trails`)**: Cryptographically signed SHA-256 record documenting compliance status (`compliant` vs `denied`), user, role, prompt/response hashes, and total tokens/cost.
- **Execution Trace (`log.Attempts`)**: JSON breakdown recording the exact failover chain (`provider:credential_id`), retries, and tool/resource invocations.

---

## Verification & Test Standard

All governance and admission rules are validated by Golden Path integration tests in `apps/api/internal/handlers/golden_path_test.go`:
- `TestGoldenPathTenantSecurity_CrossOrgHeaderRejected`
- `TestGoldenPathDeniedByRBAC_ZeroProviderCalls`
- `TestSDKAndCLIGovernanceConsistency`
