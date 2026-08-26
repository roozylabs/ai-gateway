# 🏢 RoozyLabs Prism — Agent Team Structure & Hiring Directives for Roozy (CEO)

## 📌 Executive Overview

To successfully maintain, scale, and operate **RoozyLabs Prism (v2.1.0)** as an enterprise-grade Universal AI Control Plane, **Roozy (CEO)** must expand the Paperclip Agent Team beyond Product/BA (**Eleana**) to include specialized Engineering, Security, and DevOps agents.

---

## 👥 Proposed Agent Organization Chart

```text
                        ┌─────────────────────────────────┐
                        │           Roozy (CEO)           │
                        │ Strategic Leadership & Org Head │
                        └────────────────┬────────────────┘
                                         │
       ┌──────────────────┬──────────────┴──────┬──────────────────┐
       ▼                  ▼                     ▼                  ▼
┌──────────────┐   ┌──────────────┐      ┌──────────────┐   ┌──────────────┐
│    Eleana    │   │  Gopher (Go) │      │  Aura (UI)   │   │ Sentinel(Sec)│
│  Product/BA  │   │ Backend Eng  │      │ Frontend Eng │   │ Sec & Audit  │
└──────────────┘   └──────────────┘      └──────────────┘   └──────────────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │ Aegis (Dev)  │
                                         │ DevOps & SRE │
                                         └──────────────┘
```

---

## 📄 Detailed Agent Hiring Specifications

### 1. **Gopher** — Senior Go Backend Engineer
- **Title**: Senior Go Backend & Proxy Engine Specialist
- **Reports to**: Roozy (CEO)
- **Role Capabilities**: High-performance Go 1.25 development, HTTP proxy engine optimization, provider adapter maintenance, circuit breaker tuning, SQL database migrations, and Redis concurrency pooling.
- **Assigned Skills**: `prism-guide`, `prism-proxy-adapters`, `prism-database-migrations`
- **Adapter Model**: `prism-auto`
- **Custom Header**: `X-Prism-Agent-ID: gopher-backend-eng`

### 2. **Aura** — Senior Frontend & UI Engineer
- **Title**: Senior Frontend & Web Experience Engineer
- **Reports to**: Roozy (CEO)
- **Role Capabilities**: Next.js 15 App Router development, Ant Design 5 UI components, Astro 5 landing page responsiveness, dynamic tenant selectors, real-time SSE stream hooks, and playground visualizers.
- **Assigned Skills**: `prism-guide`
- **Adapter Model**: `prism-auto`
- **Custom Header**: `X-Prism-Agent-ID: aura-frontend-eng`

### 3. **Sentinel** — Security & Governance Auditor
- **Title**: Enterprise Security & Compliance Auditor
- **Reports to**: Roozy (CEO)
- **Role Capabilities**: Declarative RBAC policy engine management (`/governance`), SHA-256 cryptographic audit trail verification (`/audit-trail`), Agent Identity boundaries (`/agents`), and key encryption vault isolation.
- **Assigned Skills**: `prism-guide`, `prism-business-metrics`
- **Adapter Model**: `prism-auto`
- **Custom Header**: `X-Prism-Agent-ID: sentinel-security-auditor`

### 4. **Aegis** — DevOps & FinOps Infrastructure Engineer
- **Title**: SRE & FinOps Infrastructure Specialist
- **Reports to**: Roozy (CEO)
- **Role Capabilities**: Docker Compose configuration, GitHub Actions CI/CD workflows, Redis keyspace monitoring, budget alert velocity tracking, and zero-downtime VPS deployment.
- **Assigned Skills**: `prism-guide`, `prism-business-metrics`
- **Adapter Model**: `prism-auto`
- **Custom Header**: `X-Prism-Agent-ID: aegis-devops-eng`

---

## 📝 Task Template to Assign in Paperclip UI

Copy and paste the task prompt below into **Paperclip > New Task** and assign it to **Roozy**:

### **Task Title**: `[HIRE-AGENTS] Hire & Configure Specialized Engineering & Security Agent Team for Prism`
### **Task Description**:

```text
As Roozy (CEO), hire and configure 4 specialized AI agents in Paperclip to form the full operational engineering team for RoozyLabs Prism (v2.1.0):

1. Gopher (Senior Go Backend Engineer):
   - Capabilities: Go 1.25, Proxy Engine, Adapters, Migrations 001-060, Redis Cooldowns.
   - Assigned Skills: prism-guide, prism-proxy-adapters, prism-database-migrations.
   - Model: prism-auto

2. Aura (Senior Frontend UI Engineer):
   - Capabilities: Next.js 15 Dashboard, Ant Design 5, Astro 5 Web, SSE Hooks, TenantSelector.
   - Assigned Skills: prism-guide.
   - Model: prism-auto

3. Sentinel (Security & Governance Auditor):
   - Capabilities: Declarative RBAC Engine, SHA-256 Audit Trail Verification, Agent Boundaries.
   - Assigned Skills: prism-guide, prism-business-metrics.
   - Model: prism-auto

4. Aegis (DevOps & FinOps Specialist):
   - Capabilities: Docker, GitHub Actions CI/CD, Redis Telemetry, Spend Velocity Alerts.
   - Assigned Skills: prism-guide, prism-business-metrics.
   - Model: prism-auto

Refer to docs/AGENT_ORGANIZATION_HIRE_SPEC.md for full specs. Confirm when all 4 agents are created in the Paperclip Org tree under Roozy.
```
