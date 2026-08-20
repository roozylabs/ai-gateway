# Business Analyst Report: RoozyLabs AI Gateway x Tool Providers Knowledge Base Review

**Issue:** ROOA-4
**Author:** Business Analyst Agent (Eleana)
**Date:** 2026-08-20
**Status:** Analysis Complete - Ready for CEO Review

---

## Executive Summary

The Knowledge Base document (`roozylabs-ai-gateway-knowledge-base.md`) demonstrates strong architectural thinking with a well-defined abstraction layer strategy for Tool Providers. The document correctly positions Apify as one execution backend within a broader Tool Provider layer, and the Tool abstraction design is sound. However, there are **significant gaps** in commercialization strategy, billing unit economics, enterprise compliance, and integration experience detail that must be addressed before RoozyLabs can execute a production-grade multi-tenant SaaS launch.

**Overall Assessment: B+ (Architecturally Strong, Commercially Underdeveloped)**

---

## 1. GAP Analysis: Strategic Gaps in the Knowledge Base

### 1.1. Critical Gaps (Must Address)

| Gap ID | Gap | Impact | Priority |
|--------|-----|--------|----------|
| G-01 | **No Billing/Pricing Model Defined** | The KB discusses cost and usage tracking conceptually but provides zero specifics on how RoozyLabs will charge clients. No credits system, no tier pricing, no per-execution cost model. Without this, commercialization is impossible. | **P0** |
| G-02 | **No Tool Execution Cost Model** | Apify Actor execution has real compute costs (compute units, dataset storage, proxy usage). The KB mentions `estimated_cost` in the ToolRun schema but never defines how this is calculated, what margin is applied, or how it is passed to clients. | **P0** |
| G-03 | **No Multi-Auth Type Details for V2** | Section on enterprise auth mentions GCP OAuth, Service Accounts, AWS IAM, Azure OAuth as concepts, but provides no workflow diagrams, no token refresh logic, no credential lifecycle state machine. The existing `credentials.auth_type` enum already supports these types at schema level, but there is zero implementation guidance for tool providers. | **P1** |
| G-04 | **No Abuse Prevention / Fraud Detection** | No mention of abuse prevention mechanisms for tool execution. Tool execution is more expensive and harder to reverse than LLM token calls. A single misconfigured agent could execute thousands of Apify Actors, causing significant cost exposure. | **P1** |
| G-05 | **No SLA / Performance Targets for Tools** | The LLM layer has TTFT < 1,500 ms targets, but no equivalent performance targets for tool execution. Apify Actors can take seconds to minutes; the KB does not define acceptable latency budgets, timeout policies, or degradation behavior. | **P1** |

### 1.2. Important Gaps (Should Address)

| Gap ID | Gap | Impact | Priority |
|--------|-----|--------|----------|
| G-06 | **No Data Retention / Privacy Policy for Tool Results** | Tool execution results (scraped web data, search results) may contain PII or copyrighted content. No mention of data retention, deletion, or GDPR/CCPA compliance for tool outputs. | **P2** |
| G-07 | **No Webhook Infrastructure Specification** | Section 10 describes webhook-driven async execution but provides no webhook security (HMAC signing), retry policy, endpoint registration API, or delivery guarantee semantics. | **P2** |
| G-08 | **No Rate Limit Specification for Tool Execution** | The existing system has RPM limits per gateway key for LLM requests, but no equivalent for tool execution. Tool execution has different cost profiles - a single web scrape could cost 10-50x a single LLM token request. | **P2** |
| G-09 | **No Versioning Strategy for Tool APIs** | The KB proposes API surfaces like `/v1/tools/run` but never discusses versioning, deprecation, or backward compatibility for tool schemas. | **P2** |
| G-10 | **No Competitive Analysis** | The KB lists potential tool providers but provides no competitive positioning vs. existing solutions (e.g., Composio, LangChain toolkits, direct Apify MCP server). What is RoozyLabs' unique value proposition? | **P3** |

### 1.3. Positive Observations

The KB excels in several areas:
- **Abstraction layer design** is architecturally sound with `ToolProvider` interface, provider-agnostic Tool Registry, and normalized result format
- **Provider independence** is well-maintained - clients interact with `RoozyLabs Tools`, not raw Apify Actor IDs
- **Security principles** for credential management are comprehensive (encryption at rest, never expose to clients, rotation, revocation)
- **MCP gateway direction** correctly identifies the long-term value of unified tool surface for AI agents
- **Phased MVP approach** (Phases 1-7) is practical and avoids over-engineering

---

## 2. Business and Financial Recommendations

### 2.1. Pricing Model Recommendation

**Current State:** No pricing model exists. The `SettingCategoryBilling` and `SettingCategoryCurrency` enums are defined in the database but unused.

**Recommended Approach: Hybrid Credit + Execution Fee Model**

```
ROOZYLABS PRICING ARCHITECTURE

Tier 1: Free (Developer Sandbox)
  - 100 LLM requests/day
  - 10 tool executions/day
  - 1 gateway key
  - Watermarked outputs
  - Community support only

Tier 2: Pro (Pay-as-you-go)
  - $0.002/1K tokens (model pass-through +20%)
  - $0.01-0.15/tool execution (by tool type)
  - 10,000 RPM pool
  - Up to 5 gateway keys
  - Email support

Tier 3: Enterprise (Custom)
  - Volume discounts (negotiated)
  - Dedicated credential pools
  - SSO/SAML integration
  - Custom rate limits
  - SLA guarantees (99.9% uptime)
  - Dedicated support + Slack channel
```

### 2.2. Tool Execution Cost Model

Each tool should have a **base cost** that covers upstream provider execution + RoozyLabs margin:

| Tool Category | Apify Compute Cost | RoozyLabs Margin | Client Price |
|---------------|-------------------|-------------------|--------------|
| Web Search | ~$0.001-0.003/run | 25-40% | $0.0015-0.005/run |
| Website Scraper | ~$0.005-0.02/run | 25-35% | $0.007-0.03/run |
| Browser Automation | ~$0.02-0.10/run | 20-30% | $0.025-0.13/run |
| Google Maps | ~$0.003-0.01/run | 25-35% | $0.004-0.015/run |
| Data Extraction | ~$0.01-0.05/run | 20-30% | $0.013-0.07/run |

**Key Principle:** Pass through Apify compute costs with a margin buffer. The margin should be lower at scale to incentivize high-volume usage.

### 2.3. Quota Enforcement Mechanism

The current system only enforces RPM (requests per minute) via Redis sliding window. For tool execution, implement:

1. **Tool Execution Credits (TEC):** Each tool execution costs credits proportional to compute intensity. Credits are consumed from a daily pool.
2. **Daily Spend Cap:** Hard ceiling on estimated cost per gateway key per day. Once reached, tool calls return HTTP 429 with `X-RateLimit-Reset` header.
3. **Concurrent Execution Limit:** Max N simultaneous tool runs per gateway key to prevent runaway cost.
4. **Idle Execution Timeout:** Tool runs exceeding 120s are auto-cancelled unless explicitly marked as long-running.

**Abuse Prevention:**
- Velocity detection: flag gateway keys with >500% normal execution rate
- Cost anomaly detection: alert when estimated cost exceeds rolling 24h average by >3x
- New key cooldown: newly created keys have a 50 execution ramp-up window before full quota applies
- Geographic restriction: optional country-level blocking for tool execution

---

## 3. Enterprise Authentication and Access Control (V2) Evaluation

### 3.1. Current State

The `credentials` table already supports `auth_type` enum values: `api_key`, `gcp_user_oauth`, `gcp_service_account`, `azure_oauth`, `aws_iam`, `github_oauth`. This is architecturally forward-looking.

However, the KB's V2 roadmap lacks specifics on:

### 3.2. Auth Type Lifecycle Gaps

| Auth Type | Current KB Coverage | Missing Detail |
|-----------|-------------------|----------------|
| GCP User OAuth | Mentioned | Token refresh flow, consent screen setup, multi-tenant vs single-tenant, impersonation |
| GCP Service Account | Mentioned | Key file management, domain-wide delegation, Workload Identity Federation |
| AWS IAM | Mentioned | STS AssumeRole, credential chaining, region routing |
| Azure OAuth | Mentioned | Managed Identity vs App Registration, token lifetime management |
| GitHub OAuth | Not mentioned | Should be included for GitHub Copilot-style integrations |

### 3.3. Enterprise Compliance Requirements

The KB states the desired model: `Organization -> Project -> Gateway Key -> Allowed Tools -> Allowed Providers`. This is correct but insufficient for enterprise needs:

**Missing Enterprise Requirements:**
- **Audit Logging:** Every credential access, tool execution, and admin action must be logged with actor, timestamp, and action type (currently `request_logs` only covers LLM proxy requests, not tool executions or admin operations)
- **Data Residency:** Enterprise customers may require tool execution in specific regions (EU, US, APAC). Apify has limited regional execution; this constraint must be documented.
- **SSO Integration:** No mention of SAML/OIDC for organization-level authentication
- **Role-Based Access Control (RBAC):** No mention of roles (Admin, Developer, Viewer) within an organization
- **IP Whitelisting:** Enterprise keys should support source IP restrictions

### 3.4. Recommendation

Add a dedicated `enterprise` section to the KB covering:
1. Credential lifecycle state machine (active -> rotating -> expired -> revoked)
2. OAuth token refresh with retry and failover
3. Audit log schema: `audit_logs(actor_id, action, resource_type, resource_id, metadata, created_at)`
4. RBAC model: `organization_roles(user_id, org_id, role)`
5. IP allowlist on `gateway_api_keys`

---

## 4. Integration Experience for AI Coding Clients

### 4.1. Model Routing Clarity

The existing proxy engine supports `routing_rules` and credential-level `priority` for LLM model routing. The KB correctly identifies that the Tool layer should mirror this pattern.

**Friction Points for Developers:**

1. **No Tool Discovery API:** The KB proposes `GET /v1/tools` but without implementation, developers cannot discover available tools. This should be the first API endpoint built.

2. **Inconsistent Error Semantics:** LLM errors return standard HTTP codes (429, 500), but tool execution errors may have unique failure modes (timeout, actor crash, dataset limit exceeded). The KB does not define a tool-specific error schema.

3. **MCP Configuration Complexity:** The KB envisions `RoozyLabs MCP Gateway` but does not specify:
   - MCP server transport (stdio, SSE, HTTP)
   - Authentication for MCP connections
   - How MCP tool definitions map to the internal Tool Registry
   - Client-side setup instructions for OpenCode, Claude Code, Antigravity

### 4.2. Recommended Integration Patterns

For each AI coding client, define a concrete integration path:

```
OpenCode Integration:
1. Add RoozyLabs as MCP server in opencode.json
2. Configure gw_sk_xxx as Bearer token
3. RoozyLabs exposes /v1/mcp endpoint
4. MCP tool definitions auto-discovered from Tool Registry
5. AI agent can call tools via standard MCP protocol

Claude Code Integration:
1. Add RoozyLabs MCP server to .mcp.json
2. Same Bearer token auth
3. Tool schemas served via MCP capabilities endpoint

Antigravity Integration:
1. Configure in IDE settings
2. Same MCP protocol
```

### 4.3. Developer Onboarding Gap

The KB lacks a **Quick Start Guide** for developers. Recommended content:
1. Get a gateway key (signup flow)
2. Configure your AI client (3-line config)
3. Make your first LLM request
4. Make your first tool request (web-search)
5. View usage in dashboard
6. Set up billing

---

## 5. Product Roadmap Refinement

### 5.1. Revised Phase Priorities

Based on the GAP analysis, I recommend adjusting the KB's 7-phase approach:

| Phase | Original KB | Revised (BA Recommended) | Rationale |
|-------|-------------|--------------------------|-----------|
| P1 | Apify Provider + Credential Mgmt | **Billing Foundation + Apify Provider** | Without billing, there is no commercial model. Build both in parallel. |
| P2 | Tool Abstraction + Registry | **Tool Abstraction + Registry + Usage Tracking** | Usage tracking must be atomic with tool execution for billing. |
| P3 | High-value tools (web-search, scraper) | **web-search + error handling + cost tracking** | Start with highest-value, lowest-complexity tool. Add cost tracking from day 1. |
| P4 | Tool Runs + Observability | **MCP Gateway (basic) + Dashboard updates** | MCP is the primary integration vector for AI clients; prioritize it. |
| P5 | Agent Tool Calling | **Agent Tool Calling + Abuse Prevention** | Agent tool calling requires abuse prevention to avoid runaway costs. |
| P6 | MCP Gateway | **Multi-provider support (Tavily, Firecrawl)** | Add provider diversity to validate the abstraction layer. |
| P7 | Additional providers | **Enterprise features (RBAC, audit logs, SSO)** | Enterprise features unlock the $10K+ MRR segment. |

### 5.2. Q4 2026 Feature Priorities

Based on effort/impact analysis:

**High Impact, Low Effort (Do First):**
- Normalized Web Search API (`/v1/search`) - validates the entire abstraction layer
- Tool usage tracking in `tool_runs` table
- Gateway key `allowed_tools` field (already in KB, simple schema addition)

**High Impact, High Effort (Plan Now, Execute Next):**
- MCP Gateway with SSE transport
- Billing integration (Stripe webhook -> credits system)
- Dashboard tool usage analytics

**Medium Impact, Medium Effort (Queue for Next Quarter):**
- Multi-auth type support for tool providers (AWS IAM, GCP SA)
- Webhook infrastructure for async tool runs
- Research API pipeline

**Low Impact, Low Effort (Opportunistic):**
- Tool versioning strategy
- Competitive analysis documentation
- GDPR data retention policies for tool results

---

## 6. Summary of Recommendations

| # | Recommendation | Owner | Priority |
|---|---------------|-------|----------|
| 1 | Define pricing model (credits + execution fees) before building tool layer | Business/CRO | **P0** |
| 2 | Build billing foundation (Stripe integration, credits ledger) alongside Apify provider | Engineering | **P0** |
| 3 | Add abuse prevention: spend caps, concurrent limits, velocity detection | Engineering | **P1** |
| 4 | Define tool-specific error schema and SLA targets | Engineering + Product | **P1** |
| 5 | Add audit log schema for enterprise compliance | Engineering | **P1** |
| 6 | Write MCP integration quick-start guide for OpenCode/Claude Code/Antigravity | Product + DevRel | **P2** |
| 7 | Add RBAC model (Admin/Developer/Viewer) for organization multi-tenancy | Engineering | **P2** |
| 8 | Document webhook security (HMAC signing, retry policy, delivery guarantees) | Engineering | **P2** |
| 9 | Add data retention policy section to KB for tool results | Legal + Product | **P2** |
| 10 | Conduct competitive analysis vs. Composio, LangChain toolkits, direct Apify MCP | Product | **P3** |

---

**End of Report**

*This analysis is based on the current codebase state (22 migrations, 4 LLM adapters, Redis-based rate limiting, no tool execution code, no billing implementation) and the Knowledge Base document as provided.*
