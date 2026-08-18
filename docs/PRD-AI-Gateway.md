# PRD — AI Gateway

| Metadata | Detail |
| :--- | :--- |
| **Version** | 1.0 |
| **Status** | Draft |
| **Date** | 18 August 2026 |

---

## 1. Product Overview

### 1.1 Product Name
**AI Gateway** *(Nama sementara. Bisa diganti setelah branding ditentukan).*

### 1.2 Product Description
**AI Gateway** adalah sebuah *centralized AI API gateway* yang memungkinkan pengguna mengelola berbagai provider AI dan banyak API credentials dalam satu aplikasi.

Client seperti:
- **OpenCode**
- **Claude Code**
- **Antigravity**
- **Custom applications**
- **Internal tools**

Cukup menggunakan satu **Gateway API Key** dan mengarahkannya ke AI Gateway.

AI Gateway kemudian bertanggung jawab untuk:
- Memilih provider
- Memilih model
- Memilih credential yang tersedia
- Melakukan credential rotation
- Menangani rate limit
- Melakukan retry / failover
- Meneruskan streaming response
- Mencatat usage
- Memonitor kesehatan credential

---

## 2. Problem

Saat menggunakan banyak AI coding tools, pengguna sering harus mengelola API credential secara terpisah.

```text
OpenCode
 └── Anthropic API Key

Claude Code
 └── Anthropic API Key

Antigravity
 └── Google API Key

Custom App
 └── OpenAI API Key
```

Ketika sebuah API key mencapai rate limit:

```text
API Key ──→ 429 ──→ User harus mengganti credential secara manual
```

### Masalah Lainnya:
1. **API key tersebar di banyak aplikasi.**
2. **Sulit mengetahui penggunaan masing-masing credential.**
3. **Sulit melakukan rotation.**
4. **Tidak ada centralized monitoring.**
5. **Sulit melakukan failover.**
6. **Konfigurasi client harus diubah setiap kali credential berubah.**

---

## 3. Proposed Solution

AI Gateway menjadi lapisan abstraksi antara client dan AI provider.

```text
                    CLIENTS

        OpenCode   Claude Code   Antigravity
             \          |          /
              \         |         /
               └────────┼────────┘
                        ↓
                ┌───────────────┐
                │  AI Gateway   │
                │               │
                │ Auth          │
                │ Router        │
                │ Credential    │
                │ Retry         │
                │ Rate Limit    │
                │ Usage         │
                └───────┬───────┘
                        │
             ┌──────────┼──────────┐
             ↓          ↓          ↓
          OpenAI    Anthropic    Google
```

### Key Concept:
Client hanya mengetahui:
- **Gateway URL**
- **Gateway API Key**

> Provider credentials disimpan dan dikelola sepenuhnya secara aman oleh AI Gateway.

---

## 4. Goals

### Primary Goals
- **G1 — Centralized Credential Management:** Pengguna dapat menyimpan dan mengelola semua provider credentials dari satu dashboard.
- **G2 — Credential Rotation:** Gateway otomatis menggunakan credential lain ketika credential aktif mengalami rate limit atau failure tertentu.
- **G3 — Unified API:** Gateway menyediakan interface API yang mudah digunakan oleh AI clients. Target utama:
  - `/v1/models`
  - `/v1/chat/completions`
  - `/v1/responses`
- **G4 — Provider Abstraction:** Provider dapat ditambahkan tanpa mengubah konfigurasi di sisi client. Target provider:
  - OpenAI
  - Anthropic
  - Google
  - OpenRouter
- **G5 — Streaming:** Gateway harus mendukung pass-through streaming response tanpa buffering penuh.
- **G6 — Usage Monitoring:** Pengguna dapat melihat request count, token usage, error rate, credential usage, provider usage, dan model usage.
- **G7 — Secure Credential Storage:** Provider API keys tidak boleh dikirim atau ditampilkan ke client.

---

## 5. Non-Goals V1

V1 **tidak** mencakup:
- Billing system
- Public marketplace
- Team collaboration & complex RBAC
- Automatic provider account creation & purchasing API credits
- Model fine-tuning
- Prompt management
- Vector database
- Agent orchestration & autonomous model selection

> **Fokus V1:** Gateway + Routing + Credential Management + Observability.

---

## 6. Target Users

### Primary User
Developer yang menggunakan banyak AI tools dan memiliki beberapa API credentials.
```text
Developer
 ├── OpenCode
 ├── Claude Code
 ├── Antigravity
 └── Custom AI applications
```

### Secondary User
Small engineering team yang membutuhkan centralized AI infrastructure.

---

## 7. Core User Journey

### Journey A — Setup Provider
User alur:
```text
Dashboard ──→ Providers ──→ Add Provider
```

**Input Data:**
- Provider Name
- Base URL
- Enabled (Toggle)

*Contoh:*
- **Provider:** Anthropic
- **Name:** Anthropic Production
- **Base URL:** `https://api.anthropic.com`

---

## 8. Credential Management

User alur:
```text
Providers ──→ Anthropic ──→ Credentials ──→ Add Credential
```

**Form Fields:**
- Credential Name
- API Key
- Priority
- Enabled

*Contoh:*
- **Name:** Anthropic Production #1
- **API Key:** `sk-ant-xxxx`
- **Priority:** 1

Setelah disimpan:
```text
Anthropic
├── Production #1    [ ACTIVE ]
├── Production #2    [ ACTIVE ]
├── Backup #1        [ ACTIVE ]
└── Backup #2        [ DISABLED ]
```

> **Catatan Keamanan:** API key hanya ditampilkan sebagai masked value: `sk-ant-••••••••••••1234`.

---

## 9. Gateway API Key

Provider credential tidak digunakan langsung oleh client. User membuat **Gateway API Key** khusus.

Contoh: `gw_sk_8sdf89sdf...`

Client menggunakan header standar:
```http
Authorization: Bearer gw_sk_xxxxx
```

### Metadata Gateway API Key:
- Name
- Status
- Created At
- Last Used
- Request Count
- *Optional:* Expiration, Rate Limit, Allowed Models

---

## 10. Client Configuration

Contoh konfigurasi pada client tool:
- **Base URL:** `https://api.example.com/v1`
- **API Key:** `gw_sk_xxxxxxxxx`

Client **tidak pernah** mengetahui credential asli seperti `sk-ant-xxxx`, `sk-proj-xxxx`, atau `AIza...`.

---

## 11. Request Flow

```text
Client
  ↓
POST /v1/chat/completions
  ↓
Authenticate Gateway API Key
  ↓
Validate request
  ↓
Resolve model
  ↓
Resolve provider
  ↓
Acquire credential
  ↓
Forward request
  ↓
Stream response
  ↓
Record usage
```

---

## 12. Credential Rotation

Misalnya terdapat pool credential untuk Anthropic:
- Credential A → `ACTIVE`
- Credential B → `ACTIVE`
- Credential C → `ACTIVE`

**Alur Request:**
- Request #1 → A
- Request #2 → B
- Request #3 → C
- Request #4 → A

*Strategy Default:* **Round Robin / Health-aware Round Robin**

---

## 13. Rate Limit Handling

Jika provider mengembalikan `HTTP 429`:

```text
Credential A ──→ 429 ──→ Mark RATE_LIMITED ──→ Read Retry-After ──→ Set cooldown
                                                                         │
Credential B ←────────────────── Retry request ←─────────────────────────┘
      ↓
Success (User tetap menerima response normal tanpa error)
```

---

## 14. Credential State

| State | Deskripsi |
| :--- | :--- |
| `ACTIVE` | Credential sehat dan siap digunakan. |
| `RATE_LIMITED` | Credential sementara masuk masa cooldown dan tidak dialokasikan. |
| `INVALID` | Credential error permanen (`401`, `403`). Di-disable sampai user memvalidasi ulang. |
| `DISABLED` | Credential sengaja dinonaktifkan oleh pengguna. |

---

## 15. Retry Policy

- **Default:** `max retries = 2`

```text
Credential A (429) ──→ Credential B (429) ──→ Credential C (Success 200)
```

### Klasifikasi Error:
- **Retryable:** `429`, `500`, `502`, `503`, `504`, Network Timeout
- **Non-Retryable:** `400`, `401`, `403`, Invalid Request, Invalid Model

---

## 16. Provider Architecture

Backend menggunakan pattern Provider Abstraction Interface:

```text
       Provider Interface
               │
   ┌───────────┼───────────┐
   ↓           ↓           ↓
OpenAI     Anthropic     Google
```

Setiap provider adapter bertanggung jawab terhadap:
- Authentication
- Request transformation
- Response transformation
- Streaming handling
- Error normalization

---

## 17. Model Routing

Mapping model ke provider default & fallback:
- `claude-sonnet` ──→ Anthropic
- `gpt-5` ──→ OpenAI
- `gemini` ──→ Google

---

## 18. Routing Strategy

- **V1 (MVP):** Round Robin (`A → B → C → A → B → C`)
- **V1.1:** Least Recently Used (LRU - credential paling lama idle diprioritaskan)
- **V2:** Weighted Routing (`A: 5, B: 3, C: 1`), Provider Fallback, Model Fallback, Cost-based & Latency-based Routing

---

## 19. Dashboard Mockup

```text
┌──────────────────────────────────────────────┐
│ AI Gateway                                   │
├──────────────────────────────────────────────┤
│                                              │
│ Requests       Tokens        Errors          │
│ 12,482         8.4M          1.2%            │
│                                              │
├──────────────────────────────────────────────┤
│ Provider Health                              │
│                                              │
│ OpenAI       ● Healthy                       │
│ Anthropic    ● Healthy                       │
│ Google       ● Healthy                       │
│                                              │
├──────────────────────────────────────────────┤
│ Recent Requests                              │
│                                              │
│ 10:42  claude-sonnet   1.2s   200            │
│ 10:41  gpt-5           0.8s   200            │
│ 10:41  claude-sonnet   0.3s   429 → retry    │
└──────────────────────────────────────────────┘
```

---

## 20. Dashboard Navigation

```text
Dashboard

Gateway
├── API Keys
├── Models
└── Routing

Providers
├── All Providers
├── Credentials
└── Health

Monitoring
├── Usage
├── Requests
└── Errors

Settings
├── General
└── Security
```

---

## 21. Credentials Table & Actions

### Table Schema

| Name | Provider | Status | Requests | Last Used | Actions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Production #1 | Anthropic | Active | 1,240 | 2m ago | View, Edit, Test, Disable |
| Production #2 | Anthropic | Active | 892 | 1m ago | View, Edit, Test, Disable |
| Backup #1 | Anthropic | Rate Limited | 431 | 8m ago | View, Edit, Test, Enable |

**Tersedia Actions:** `View`, `Edit`, `Enable`, `Disable`, `Test`, `Delete`. *(Key selalu di-mask).*

---

## 22. Request Logs Schema

Setiap request mencatat payload log terstruktur:
- `Request ID`
- `Timestamp`
- `Gateway API Key`
- `Provider`
- `Model`
- `Credential ID`
- `Status Code`
- `Latency`
- `Input Tokens`
- `Output Tokens`
- `Total Tokens`
- `Error`
- `Retry Count`

*Contoh Log Entry:*
```text
req_8sd78s
Model: claude-sonnet
Provider: Anthropic
Credential: anthropic-prod-02
Status: 200
Latency: 1.82s
Input: 4,281
Output: 1,204
Retry: 1
```

---

## 23. Security

Keamanan adalah aspek paling kritikal karena aplikasi menyimpan private API credentials.

1. **Credential Encryption:**
   - Semua provider API keys wajib terenkripsi saat istirahat (*encrypted at rest*).
   - Database tidak pernah menyimpan plaintext credential.
2. **API Key Hashing:**
   - Gateway API key disimpan dalam bentuk Secure Hash. Plaintext key hanya ditampilkan 1x saat pembuatan (`hash(gw_sk_xxxxx)`).
3. **Secret Exposure Prevention:**
   - Provider API key dilarang keras muncul pada: frontend response, browser `localStorage`, server logs, error messages, analytics data, maupun request trace logs.

---

## 24. Database Schema & Relationships

### Core Tables
- `users`
- `providers`
- `models`
- `credentials`
- `gateway_api_keys`
- `routing_rules`
- `request_logs`
- `usage_records`

### Relationships
```text
users
  │
  ├── gateway_api_keys
  │
  ├── providers
  │       │
  │       ├── credentials
  │       │
  │       └── models
  │
  └── routing_rules

request_logs
      │
      ├── gateway_api_key
      ├── provider
      ├── model
      └── credential
```

---

## 25. Backend Architecture (Go + Gin)

```text
internal/
├── auth/
├── api/
├── credentials/
├── providers/
├── routing/
├── proxy/
├── retry/
├── ratelimit/
├── usage/
├── logging/
└── health/
```

### Request Lifecycle
```text
HTTP Request
     ↓
Gin Middleware
     ↓
Authentication
     ↓
Request Validation
     ↓
Router
     ↓
Credential Pool
     ↓
Provider Adapter
     ↓
HTTP Client (Upstream)
     ↓
Stream Response
     ↓
Usage Recorder
```

---

## 26. Redis Responsibilities

Redis dialokasikan untuk state dengan kebutuhan latency sangat rendah:
- **Credential Cooldown:** `credential:{id}:cooldown`
- **Distributed Lock:** `credential:{id}:lock`
- **Rate Limiting:** `gateway:{api_key}:rate_limit`
- **Temporary Provider Health:** `provider:{id}:health`

> *PostgreSQL tetap bertindak sebagai Single Source of Truth.*

---

## 27. Frontend Architecture (Next.js)

```text
Next.js
├── app/
├── components/
├── features/
│   ├── dashboard/
│   ├── providers/
│   ├── credentials/
│   ├── models/
│   ├── routing/
│   ├── usage/
│   └── logs/
├── hooks/
├── lib/
└── types/
```

- **UI Framework:** Ant Design
- **Forms & Validation:** React Hook Form + Zod
- **Server State Management:** TanStack Query

---

## 28. API Design

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Providers
- `GET /api/providers`
- `POST /api/providers`
- `GET /api/providers/:id`
- `PATCH /api/providers/:id`
- `DELETE /api/providers/:id`

### Credentials
- `GET /api/credentials`
- `POST /api/credentials`
- `GET /api/credentials/:id`
- `PATCH /api/credentials/:id`
- `DELETE /api/credentials/:id`
- `POST /api/credentials/:id/test`

### Gateway (OpenAI Compatible)
- `GET /v1/models`
- `POST /v1/chat/completions`
- `POST /v1/responses`

---

## 29. API Key Authentication Pipeline

```text
Gateway Request (Authorization: Bearer gw_sk_xxxxxxxxx)
                       ↓
                  Hash Check
                       ↓
               Database / Cache
                       ↓
                  User Context
                       ↓
               Permissions Check
                       ↓
              Execute Request Pipeline
```

---

## 30. Observability & Monitoring

### Metrics Utama:
- Requests per second (RPS)
- Success rate & Error rate
- 429 Rate
- Average / P95 / P99 Latency
- Token usage (Input / Output / Total)
- Provider & Credential breakdown

### Health Check Monitors:
- Provider Health
- Credential Health
- Redis Health
- PostgreSQL Health

---

## 31. Cost Tracking

- **V1:** Menyimpan volume token usage (Input/Output).
- **V1.1:** Estimasi Biaya Otomatis:
  $$	ext{Estimated Cost} = (	ext{Input Tokens} 	imes 	ext{Price}_{	ext{in}}) + (	ext{Output Tokens} 	imes 	ext{Price}_{	ext{out}})$$

*Contoh Ringkasan Biaya:*
- **Anthropic:** 4,281 requests | 8.2M tokens | Estimated Cost: **$32.41**

---

## 32. Error Normalization

Gateway menormalisasi respons error provider agar client menerima interface error yang konsisten.

Jika seluruh credential mengalami exhaustion:
```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "error": {
    "type": "provider_exhausted",
    "message": "No available credentials for this provider."
  }
}
```

---

## 33. Rate Limiting Multi-tier

1. **Gateway Level:** Dibatasi per Gateway API Key (e.g. `100 requests/minute`).
2. **Provider Credential Level:** Mengikuti batas rate limit provider asli dengan automatic cooldown.

---

## 34. Health Check Validation Flow

```text
Dashboard [Test Credential] ──→ Provider API Ping ──→ HTTP 200 [✓ Credential is valid (342ms)]
                                                   └── HTTP 401 [✕ Credential invalid]
```

---

## 35. Deployment Topology

### Development
Docker Compose (`Next.js` + `Go` + `PostgreSQL` + `Redis`)

### Production
```text
                    Cloudflare
                        │
                ┌───────┴───────┐
                ↓               ↓
             Web             API
           Next.js          Go/Gin
                               │
                         ┌─────┴─────┐
                         ↓           ↓
                      Redis      PostgreSQL
```

---

## 36. Environment Variables

```env
DATABASE_URL=postgres://...
REDIS_URL=redis://...
JWT_SECRET=...
ENCRYPTION_KEY=...
OPENAI_BASE_URL=https://api.openai.com
ANTHROPIC_BASE_URL=https://api.anthropic.com
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com
```
> *Catatan: Provider API credentials tidak disimpan di `.env` melainkan di database via dashboard secara terenkripsi.*

---

## 37. MVP Scope Checklist

- [x] **Authentication:** Login, Logout, User session
- [x] **Provider:** Add, Edit, Enable/Disable provider
- [x] **Credential:** Add, Edit, Delete, Enable/Disable, Test, Masking, Encryption
- [x] **Gateway:** Gateway API Key, `/v1/models`, `/v1/chat/completions`, Streaming, Auth, Routing
- [x] **Rotation:** Round robin, 429 detection, Cooldown, Automatic retry, Failover
- [x] **Monitoring:** Request logs, Usage count, Token tracking, Status health

---

## 38. Roadmap: V1.1

- [ ] Adapter eksternal lengkap (Anthropic, Google Gemini, OpenRouter)
- [ ] Weighted routing & fallback cascade
- [ ] Cost tracking per token
- [ ] Advanced request filtering & dynamic rate limits

---

## 39. Roadmap: V2 (Multi-Tenant & Teams)

```text
Organization
 ├── Users & RBAC
 ├── API Keys & Quotas
 ├── Providers & Credentials
 ├── Routing Policies
 └── Audit Logs & Budgeting
```

---

## 40. Success Metrics

| Metric | Target |
| :--- | :--- |
| **Reliability** | > 99% Gateway Availability |
| **Failover Overhead** | < 500ms additional routing latency saat terjadi 429 |
| **Streaming** | Zero full-response buffering (real-time stream pass-through) |
| **Security** | 0 provider credential leak ke client / logs |
| **Gateway Overhead** | < 50ms internal processing overhead (di luar upstream latency) |

---

## 41. Critical Technical Requirements

- **R1 — Streaming:** Wajib mendukung pass-through streaming tanpa buffer utuh.
- **R2 — Credential Isolation:** Client tidak boleh menerima upstream API key.
- **R3 — Atomic Credential Selection:** Pemilihan credential harus thread-safe di bawah traffic concurrent tinggi.
- **R4 — Retry Safety:** Menghindari duplicate execution yang tidak diinginkan pada operasi non-idempotent.
- **R5 — Provider Abstraction:** Routing engine murni agnostik terhadap vendor AI.
- **R6 — Observability:** Setiap request wajib memiliki `request_id` unik.

---

## 42. High-Level Architecture

```text
                           INTERNET
                               │
                     ┌─────────┴─────────┐
                     │                   │
                     ↓                   ↓
              app.ai-gateway.dev   api.ai-gateway.dev
                     │                   │
                     ↓                   ↓
                 Next.js              Go + Gin
                     │                   │
                     │             ┌─────┼─────┐
                     │             │     │     │
                     │             ↓     ↓     ↓
                     │           Auth  Router Retry
                     │                   │
                     │             Credential Pool
                     │                   │
                     │          ┌────────┴────────┐
                     │          ↓                 ↓
                     │       Redis           PostgreSQL
                     │          │                 │
                     │          └────────┬────────┘
                     │                   ↓
                     │             Provider Adapter
                     │                   │
                     │       ┌───────────┼───────────┐
                     │       ↓           ↓           ↓
                     │    OpenAI      Anthropic    Google
                     │
                     └──────────── Dashboard
```

---

## 43. Development Milestones

- **Phase 1 — Foundation (Week 1):** Repo, Next.js, Go/Gin, DB migrations, Docker Compose, Auth.
- **Phase 2 — Credential Management (Week 2):** Provider & Credential CRUD, Encryption, Test connection, UI.
- **Phase 3 — Gateway Core (Week 3):** Gateway Key, `/v1` endpoints, Adapters, Streaming, Logging.
- **Phase 4 — Routing & Resilience (Week 4):** Credential pool, Round-robin, 429 cooldown, Failover, Redis lock.
- **Phase 5 — Monitoring & Analytics (Week 5):** Usage dashboard, Log viewer, Health checks, Token tracking.
- **Phase 6 — Hardening & Launch (Week 6):** Concurrency & load testing, Security audit, Deployment, Docs.

---

## 44. Definition of Done — MVP

MVP dianggap selesai ketika alur end-to-end berikut berjalan sukses:

```text
1. Login
   ↓
2. Add Anthropic provider
   ↓
3. Add 3 Anthropic API keys
   ↓
4. Create Gateway API Key
   ↓
5. Configure OpenCode / client
   ↓
6. Send request
   ↓
7. Gateway selects Key #1
   ↓
8. Response streams ke OpenCode
   ↓
9. Key #1 mendapat 429
   ↓
10. Gateway cooldown Key #1
   ↓
11. Gateway memilih Key #2
   ↓
12. Request berhasil
   ↓
13. Dashboard menampilkan request
   ↓
14. Usage tercatat
```

---

## Architecture Recommendation Summary

Untuk versi pertama, arsitektur monolitik terdistribusi modular (bukan microservices kompleks) adalah pilihan paling optimal:

```text
                 ┌─────────────────┐
                 │     Next.js     │
                 │    Dashboard    │
                 └────────┬────────┘
                          │
                    Admin REST API
                          │
                          ↓
                 ┌─────────────────┐
                 │    Go / Gin     │
                 │                 │
Client ─────────→│  AI Gateway     │────────→ Providers (OpenAI, Anthropic, Google)
 /v1/*           │                 │
                 └─────────────────┘
```
Go Gateway dapat di-scale secara horizontal secara independen di kemudian hari tanpa mengubah sisi dashboard maupun integrasi client.
