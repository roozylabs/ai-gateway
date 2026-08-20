# RoozyLabs AI Gateway × Apify — Knowledge Base

## 1. Overview

RoozyLabs AI Gateway is a centralized AI infrastructure layer that currently focuses on:

- Centralized management of AI provider credentials
- Multiple credentials per provider
- Credential rotation
- Rate-limit failover
- Retry and cooldown handling
- Unified OpenAI-compatible inference API
- Streaming responses
- Usage and observability metrics

The repository is:

- GitHub: https://github.com/roozylabs/ai-gateway
- Product concept: a single gateway for AI coding clients such as OpenCode, Claude Code, Antigravity, and custom applications.

Apify should be considered a **tool/data execution provider**, not a replacement for the LLM inference layer.

The strategic model is:

```text
RoozyLabs = AI execution gateway
        ├── Model providers
        │   ├── OpenAI
        │   ├── Anthropic
        │   ├── Google Gemini
        │   └── OpenRouter
        │
        └── Tool providers
            └── Apify
                ├── Web Search
                ├── Web Scraping
                ├── Browser Automation
                ├── Google Maps
                ├── Social/Data extraction
                └── Other Actors
```

---

# 2. Core Strategic Insight

Do not position Apify as the core of Roozy.

Instead:

> Apify is one execution backend inside RoozyLabs' Tool Provider layer.

This distinction is important because RoozyLabs should own the abstraction presented to clients.

The client should ideally interact with:

```text
RoozyLabs API
RoozyLabs Tools
RoozyLabs MCP
```

and not be tightly coupled to:

```text
Apify API
Apify Actor IDs
Apify-specific credentials
```

This allows Roozy to replace or add providers later.

Potential future tool providers:

- Apify
- Firecrawl
- Tavily
- Serper
- Browserbase
- Bright Data
- Other web/data providers

Example:

```text
RoozyLabs Tool
    │
    ├── Provider: Apify
    ├── Provider: Firecrawl
    └── Provider: Other
```

---

# 3. What Apify Provides

Apify provides a platform for running cloud-based automation and data extraction workloads called **Actors**.

An Actor can be treated conceptually as:

```text
JSON Input
    ↓
Actor execution
    ↓
Structured output
```

Examples of workloads suitable for Apify:

- Web scraping
- Website crawling
- Search
- Browser automation
- Google Maps data extraction
- Social media data extraction
- Lead generation
- Data enrichment
- Structured data extraction

Apify also provides APIs for running Actors and retrieving their results.

For long-running workloads, asynchronous execution and webhooks are preferable to continuously polling.

---

# 4. Recommended Roozy Architecture

The current architecture can evolve from:

```text
Client
  ↓
RoozyLabs AI Gateway
  ↓
LLM Provider
```

into:

```text
Client / Agent
        ↓
RoozyLabs AI Gateway
        │
        ├── Model Router
        │      ├── OpenAI
        │      ├── Anthropic
        │      ├── Gemini
        │      └── OpenRouter
        │
        ├── Tool Router
        │      ├── Apify
        │      ├── Search
        │      ├── Browser
        │      └── Scraper
        │
        ├── Credential Manager
        │
        ├── Rate Limit / Retry
        │
        ├── Cost Tracking
        │
        └── Observability
```

The key architectural principle is:

> Models and tools should be routed independently.

For example:

```text
LLM request
    ↓
Anthropic

Tool request
    ↓
Apify
```

The model provider and tool provider do not need to be the same vendor.

---

# 5. Apify as a Credential Provider

RoozyLabs can add Apify to its credential-management system.

Current conceptual model:

```text
Provider
├── OpenAI
│   ├── Credential A
│   └── Credential B
├── Anthropic
│   ├── Credential A
│   └── Credential B
└── Gemini
    ├── Credential A
    └── Credential B
```

Extend it to:

```text
Tool Provider
└── Apify
    ├── Credential A
    └── Credential B
```

Apify credentials should be:

- Stored encrypted at rest
- Never exposed to clients
- Never included in logs
- Resolved server-side
- Rotatable
- Revocable

The same security philosophy used for LLM provider credentials should apply to Apify credentials.

---

# 6. Apify Connector

A dedicated Apify connector can abstract Apify API calls.

Conceptual interface:

```go
type ToolProvider interface {
    Run(ctx context.Context, tool Tool, input map[string]any) (ToolResult, error)
}
```

Apify implementation:

```go
type ApifyProvider struct {
    client *ApifyClient
}
```

The gateway should not scatter Apify-specific HTTP calls throughout the application.

Instead:

```text
Tool Router
    ↓
Tool Provider Interface
    ↓
Apify Provider
    ↓
Apify API
```

This makes future provider replacement easier.

---

# 7. Tool Registry

RoozyLabs should eventually introduce a Tool Registry.

Example:

```text
Tools
├── Web Search
├── Website Scraper
├── Browser
├── Google Maps
├── Lead Generation
└── Research
```

Each Roozy tool should have metadata such as:

```json
{
  "id": "web-search",
  "name": "Web Search",
  "description": "Search the web and return structured results",
  "provider": "apify",
  "execution_mode": "async",
  "input_schema": {},
  "output_schema": {}
}
```

Important:

The internal provider implementation can use an Apify Actor, but the public tool identity should belong to Roozy.

Example:

```text
RoozyLabs Tool
web-search
    ↓
Apify Actor
    ↓
normalized Roozy result
```

---

# 8. Why Tool Abstraction Matters

Do not expose raw Apify Actor IDs as the primary public API.

Avoid:

```http
POST /v1/apify/actors/apify~some-actor/run
```

as the main product abstraction.

Prefer:

```http
POST /v1/tools/web-search/run
```

Internally:

```text
web-search
    ↓
provider = apify
    ↓
actor = selected Actor
```

Benefits:

1. Provider independence
2. Easier pricing control
3. Easier observability
4. Easier migration
5. Cleaner developer experience
6. Consistent API contracts
7. Ability to add multiple execution providers

---

# 9. Tool Execution API

A future RoozyLabs API could look like:

```http
POST /v1/tools/run
Authorization: Bearer gw_sk_xxx
Content-Type: application/json
```

Request:

```json
{
  "tool": "web-search",
  "input": {
    "query": "AI startups in Indonesia"
  }
}
```

Gateway flow:

```text
Request
  ↓
Authenticate Gateway Key
  ↓
Resolve Tool
  ↓
Resolve Provider
  ↓
Resolve Credential
  ↓
Execute Apify Actor
  ↓
Normalize Result
  ↓
Record Usage
  ↓
Return Result
```

---

# 10. Synchronous vs Asynchronous Execution

Not every Apify workload should be treated as a synchronous HTTP request.

Short workloads:

```text
Client
  ↓
RoozyLabs
  ↓
Apify
  ↓
Result
```

Long-running workloads:

```text
Client
  ↓
RoozyLabs
  ↓
Create Tool Run
  ↓
Apify Actor
  ↓
Webhook
  ↓
Roozy updates run
  ↓
Client retrieves result
```

Recommended API concepts:

```http
POST /v1/tools/run
GET  /v1/tools/runs/:id
GET  /v1/tools/runs/:id/result
```

Potential run states:

```text
queued
running
succeeded
failed
cancelled
timeout
```

For long-running jobs, prefer webhook-driven state updates rather than aggressive polling.

---

# 11. Tool Result Normalization

Apify outputs may differ between Actors.

RoozyLabs should normalize outputs into a stable internal format.

Example:

```json
{
  "run_id": "run_xxx",
  "status": "succeeded",
  "tool": "web-search",
  "provider": "apify",
  "data": [
    {
      "title": "Example",
      "url": "https://example.com",
      "snippet": "..."
    }
  ],
  "usage": {
    "duration_ms": 2310
  }
}
```

The client should not need to understand the raw Apify response structure.

---

# 12. AI Agent Tool Calling

This is one of the highest-value use cases.

Architecture:

```text
User
  ↓
AI Agent
  ↓
RoozyLabs AI Gateway
  ↓
LLM
  ↓
Tool Call
  ↓
RoozyLabs Tool Router
  ↓
Apify
  ↓
Tool Result
  ↓
LLM
  ↓
Final Response
```

Example user request:

> Find 20 AI companies in Jakarta and collect their website and company information.

The agent may decide:

```text
1. Search
2. Extract company information
3. Visit websites
4. Normalize data
5. Summarize
```

Roozy coordinates the model and tool execution.

---

# 13. Research API

A higher-level product can eventually be built on top of the tool layer.

Example:

```http
POST /v1/research
```

Input:

```json
{
  "query": "Compare AI gateway platforms in 2026"
}
```

Possible pipeline:

```text
Research Request
      ↓
Search
      ↓
Scrape relevant sources
      ↓
Extract structured information
      ↓
LLM analysis
      ↓
Research result
```

Apify can provide the web/data execution layer while Roozy handles:

- orchestration
- model selection
- tool selection
- credential management
- usage tracking
- cost tracking
- final synthesis

---

# 14. Web Search API

A practical first tool to implement is a normalized Web Search API.

Example:

```http
POST /v1/search
```

Request:

```json
{
  "query": "AI startups in Indonesia 2026"
}
```

Internal pipeline:

```text
/v1/search
    ↓
RoozyLabs Tool Registry
    ↓
web-search
    ↓
Apify
    ↓
normalize
    ↓
response
```

Response:

```json
{
  "query": "AI startups in Indonesia 2026",
  "results": [
    {
      "title": "...",
      "url": "...",
      "snippet": "..."
    }
  ]
}
```

This keeps the client independent from Apify.

---

# 15. Cost and Usage Tracking

Roozy already has an observability direction.

Apify execution should be incorporated into usage tracking.

Potential metrics:

```text
Tool usage
├── tool runs
├── duration
├── success rate
├── failure rate
├── provider
└── estimated cost
```

A unified usage dashboard could eventually show:

```text
AI Usage
────────────────────
OpenAI          $0.82
Anthropic       $1.14
Gemini          $0.32

Tool Usage
────────────────────
Apify           $0.71

Total           $2.99
```

This is important for teams because they can understand total AI infrastructure spend rather than only LLM token spend.

---

# 16. MCP Direction

Apify supports AI-agent integrations and MCP.

RoozyLabs should consider building its own MCP gateway rather than forcing every client to connect directly to individual providers.

Potential architecture:

```text
Claude Code
OpenCode
Antigravity
Cursor
Custom Agent
      ↓
RoozyLabs MCP Gateway
      ↓
Tool Router
      ├── Apify
      ├── Search
      ├── Browser
      ├── GitHub
      └── Internal Tools
```

This creates a unified tool surface.

Long-term:

```text
RoozyLabs
├── OpenAI-compatible inference API
├── Tool API
└── MCP Gateway
```

---

# 17. Provider-Agnostic Tool Architecture

The desired long-term abstraction is:

```text
Tool
  ↓
Provider Resolver
  ↓
Provider
```

Example:

```text
web-search
   ├── Apify
   ├── Tavily
   └── Serper
```

Another example:

```text
web-scraper
   ├── Apify
   ├── Firecrawl
   └── Bright Data
```

The gateway can eventually select providers based on:

- Availability
- Cost
- Latency
- Rate limit
- Capability
- User configuration

This is analogous to the existing LLM credential routing model.

---

# 18. Reliability Strategy

Apify integration should reuse RoozyLabs' reliability concepts.

Potential strategy:

```text
Tool Request
    ↓
Provider health check
    ↓
Credential selection
    ↓
Execute
    ↓
Success → return
    ↓
Failure
    ↓
Retry / cooldown / fallback
```

Possible future routing:

```text
web-search
    ↓
Apify credential A
    ↓
429 / failure
    ↓
Apify credential B
    ↓
failure
    ↓
fallback provider
    ↓
Tavily
```

However, provider fallback should only happen when the fallback provider supports equivalent semantics.

Do not blindly retry non-idempotent operations.

---

# 19. Security Considerations

Apify credentials are sensitive secrets.

Rules:

- Encrypt credentials at rest.
- Never expose raw provider credentials to clients.
- Never put provider tokens in URLs.
- Never log Authorization headers.
- Never return provider credentials in tool results.
- Apply least-privilege credentials where supported.
- Support credential revocation.
- Track credential usage.
- Separate user/team/project credentials where appropriate.
- Apply tool-level authorization.

Potential model:

```text
Organization
  ↓
Project
  ↓
Gateway Key
  ↓
Allowed Tools
  ↓
Allowed Providers
```

Example:

```json
{
  "gateway_key": "gw_sk_xxx",
  "allowed_tools": [
    "web-search",
    "website-scraper"
  ]
}
```

---

# 20. Multi-Tenant Considerations

If Roozy becomes a SaaS product, Apify credentials should be scoped per tenant.

Example:

```text
Organization A
├── Gateway Keys
├── OpenAI credentials
└── Apify credentials

Organization B
├── Gateway Keys
├── Anthropic credentials
└── Apify credentials
```

Never allow:

```text
Organization A
      ↓
Organization B's Apify credential
```

unless explicitly configured and authorized.

---

# 21. Dashboard UX

A future RoozyLabs dashboard can expose:

```text
Providers
├── AI Providers
│   ├── OpenAI
│   ├── Anthropic
│   ├── Gemini
│   └── OpenRouter
│
└── Tool Providers
    └── Apify
```

Tool catalog:

```text
Tools
────────────────────────────

Web Search
Search and retrieve structured web results

Website Scraper
Extract content from websites

Google Maps
Search businesses and locations

Browser
Execute browser-based workflows

Research
Perform multi-step web research
```

Each tool can expose:

- Status
- Provider
- Configuration
- Input schema
- Output schema
- Usage
- Cost
- Recent executions

---

# 22. Do Not Overcouple the Database

Avoid a schema that only works for Apify.

Bad:

```text
apify_actor_id
apify_token
apify_dataset_id
```

throughout the core domain model.

Prefer generic concepts:

```text
providers
provider_credentials
tools
tool_runs
tool_provider_bindings
```

Then provider-specific configuration can live inside provider configuration or a typed integration layer.

Example:

```text
tool
  ↓
tool_provider_binding
  ↓
provider
  ↓
provider_credential
```

This allows additional providers later.

---

# 23. Suggested Domain Model

Conceptually:

```text
Provider
- id
- type
- name
- status

ProviderCredential
- id
- provider_id
- name
- encrypted_secret
- status
- metadata

Tool
- id
- name
- description
- input_schema
- output_schema
- status

ToolProviderBinding
- id
- tool_id
- provider_id
- provider_config

ToolRun
- id
- tool_id
- provider_id
- credential_id
- status
- input
- output
- started_at
- completed_at
- duration_ms
- estimated_cost
```

Do not treat this as a final schema. It is an architectural direction.

---

# 24. Recommended API Surface

Potential future API:

```text
GET  /v1/tools
GET  /v1/tools/:id

POST /v1/tools/run

GET  /v1/tool-runs/:id
GET  /v1/tool-runs/:id/result

POST /v1/search

POST /v1/research
```

MCP can expose the same underlying tool registry.

Avoid implementing separate business logic for:

```text
REST
MCP
Agent SDK
```

Instead:

```text
REST / MCP / SDK
       ↓
Tool Application Layer
       ↓
Tool Router
       ↓
Provider
```

---

# 25. Initial MVP Recommendation

Do not build the entire platform at once.

Recommended MVP:

### Phase 1

Implement:

```text
Apify Provider
    ↓
Credential management
    ↓
Actor execution
```

### Phase 2

Implement:

```text
Tool abstraction
    ↓
Tool Registry
    ↓
/v1/tools/run
```

### Phase 3

Add one or two high-value tools:

```text
web-search
website-scraper
```

### Phase 4

Add:

```text
Tool Runs
Usage
Cost
Observability
```

### Phase 5

Add:

```text
Agent Tool Calling
```

### Phase 6

Add:

```text
RoozyLabs MCP Gateway
```

### Phase 7

Add additional tool providers.

---

# 26. Strategic Product Positioning

The product should not be positioned as:

> "A proxy that rotates AI API keys."

That is too narrow.

A stronger long-term positioning is:

> **RoozyLabs is an AI execution gateway that unifies models, tools, credentials, routing, and observability behind one API.**

The evolution:

```text
Stage 1
AI API Gateway
    ↓
Stage 2
Multi-provider AI Gateway
    ↓
Stage 3
AI + Tool Gateway
    ↓
Stage 4
Agent Gateway
    ↓
Stage 5
AI Execution Infrastructure
```

Apify fits primarily into Stage 3 and beyond.

---

# 27. Apify's Role in RoozyLabs

The agent should reason about Apify as:

```text
Apify = external execution provider
```

not:

```text
Apify = RoozyLabs
```

and not:

```text
Apify = LLM provider
```

Correct mental model:

```text
RoozyLabs
 ├── Model Provider Layer
 │    ├── OpenAI
 │    ├── Anthropic
 │    ├── Gemini
 │    └── OpenRouter
 │
 └── Tool Provider Layer
      └── Apify
           ├── Actor execution
           ├── Scraping
           ├── Search
           ├── Browser automation
           └── Data extraction
```

---

# 28. Important Design Principles for Agents

When an agent works on Roozy and considers Apify:

1. Prefer provider abstraction over direct coupling.
2. Keep Apify credentials server-side.
3. Treat Apify as a Tool Provider.
4. Normalize Apify outputs before exposing them to clients.
5. Use asynchronous execution for long-running Actors.
6. Use webhooks for long-running jobs where appropriate.
7. Track tool execution separately from LLM token usage.
8. Design the database around generic providers/tools.
9. Avoid hard-coding Apify-specific assumptions into core business logic.
10. Make the Tool Registry provider-agnostic.
11. Reuse RoozyLabs' existing retry, rate-limit, and observability concepts.
12. Consider MCP as a future unified interface.
13. Start with a small number of high-value tools.
14. Preserve the ability to add alternative providers later.
15. Never expose raw provider credentials through the public API.

---

# 29. Useful External References

Official Apify documentation:

- https://docs.apify.com/
- https://docs.apify.com/actors
- https://docs.apify.com/integrations/ai
- https://docs.apify.com/integrations/api

RoozyLabs repository:

- https://github.com/roozylabs/ai-gateway

---

# 30. Final Mental Model

The simplest way for an AI agent to understand the architecture:

```text
                    ROOZY
                     │
             AI Execution Gateway
                     │
        ┌────────────┴────────────┐
        │                         │
     MODELS                     TOOLS
        │                         │
 ┌──────┼──────┐            ┌─────┴─────┐
 │      │      │            │           │
OpenAI Anthropic Gemini    Apify      Future
 │      │      │            │         Providers
 └──────┴──────┘            │
                            ├── Search
                            ├── Scrape
                            ├── Browser
                            ├── Maps
                            └── Data Extraction
```

The strategic objective is to make Roozy the **unified control plane** for AI models and agent tools.

Apify is an important execution backend within that architecture, especially for web/data workloads.
