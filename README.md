# AI Gateway 🚀

[![Go Version](https://img.shields.io/badge/Go-1.24-00ADD8?style=flat&logo=go)](https://golang.org)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat&logo=docker)](https://www.docker.com/)
[![CI/CD Pipeline](https://github.com/roozylabs/ai-gateway/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/roozylabs/ai-gateway/actions/workflows/ci-cd.yml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**AI Gateway** adalah *centralized AI API Gateway* berkinerja tinggi yang memungkinkan Anda mengelola berbagai provider AI (OpenAI, Anthropic, Google Gemini, OpenRouter) dan banyak API credential dalam satu tempat.

Dengan **AI Gateway**, AI coding tools Anda (seperti **OpenCode**, **Claude Code**, **Antigravity**, maupun aplikasi custom) cukup terhubung ke satu **Gateway API Key** dan **Gateway URL**.

---

## 📐 Arsitektur Sistem

```text
                        CLIENTS
       ┌───────────────────┼───────────────────┐
       │                   │                   │
    OpenCode          Claude Code          Antigravity
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │ (Authorization: Bearer gw_sk_xxx)
                           ▼
                  ┌─────────────────┐
                  │   AI Gateway    │
                  │                 │
                  │  • Auth         │
                  │  • Router       │
                  │  • Rotation     │
                  │  • Retry (429)  │
                  │  • Streaming    │
                  │  • Observability│
                  └────────┬────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   OpenAI API        Anthropic API      Google Gemini
```

---

## ✨ Fitur Utama

- **🧠 Roozy Auto Smart Router (`roozy-auto`)**: Router cerdas yang mengklasifikasikan karakteristik request (Task, Complexity, Context Size) secara deterministik dan melakukan *weighted scoring* untuk memilih model/provider paling optimal.
- **💰 AI Budget Manager & Auto Downgrade**: Mengatur *monthly/daily spend limits*, *warning/critical thresholds*, dan secara otomatis melakukan *model downgrade* saat terjadi tekanan anggaran sebelum menyentuh *hard cutoff*.
- **🔑 Centralized Credential Management**: Simpan dan kelola banyak API key provider dari berbagai akun secara terpusat dengan enkripsi **AES-256-GCM** (*encrypted at rest*).
- **⚡ Instant Zero-Delay Rotation (Pre-Filtered Ready Pool)**: Rotasi strategi **Round Robin**, **LRU**, dan **Fallback Cascade** yang menyaring credential cooling 429 secara instan di Redis sebelum seleksi rute.
- **🛡️ Clean User-Friendly Error Sanitization**: Mengisolasi error teknis (dump 429, timeout net/http, UUID internal) menjadi pesan ramah pengguna dan transparan.
- **📊 Complete Audit Trail & Response Headers**: Melacak seluruh request (sukses HTTP 200 & error 429/500/502/504), keputusan routing (`/api/routing/decisions`), serta menyediakan header debugging (`X-Roozy-Model`, `X-Roozy-Provider`, `X-Request-ID`).
- **🛡️ Provider Concurrency Limiter & Cloudflare Evasion**: In-memory Go channel semaphores (default max **2** active streams per provider) & request pacing (`350ms`) untuk mencegah WAF concurrency limits.
- **🌐 Outgoing Proxy Support**: Variabel environment `GLOBAL_PROXY_URL` (SOCKS5 / HTTP Proxy) untuk meneruskan outbound request melalui IP residential / SSH tunnel.
- **🌊 Pass-Through Real-Time Streaming**: Streaming SSE real-time dengan pengumpulan token usage presisi (`stream_options: include_usage`) dan penghitungan biaya aktual (*CostUSD*).
- **🎯 Unified OpenAI-Compatible API**: Endpoint kompatibel OpenAI (`/v1/chat/completions`, `/v1/models`) sehingga kompatibel secara instan dengan mayoritas AI client.

---

## 🛠️ Teknologi & Stack

- **Backend**: Go (Golang 1.24), Gin Web Framework, SQLx
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Ant Design, Tailwind CSS
- **Database**: PostgreSQL 15 (Single Source of Truth)
- **Cache & State Store**: Redis 7 (Rate Limiting, Cooldown, Events, State)
- **Containerization**: Multi-stage Dockerfile, Docker Compose
- **CI/CD**: GitHub Actions (Linting, Automated Testing, GHCR, SSH VPS Deployment)

---

## 🚀 Panduan Memulai (Quick Start)

### 1. Prasyarat
- [Docker & Docker Compose](https://docs.docker.com/get-docker/) dipasang di sistem Anda.
- [Go 1.23+](https://go.dev/dl/) (jika ingin menjalankan/mengembangkan secara lokal tanpa Docker).

### 2. Menjalankan dengan Docker Compose

Clone repositori dan salin environment file:
```bash
git clone https://github.com/roozylabs/ai-gateway.git
cd ai-gateway
cp .env.example .env
```

Jalankan seluruh service (Go API + PostgreSQL + Redis):
```bash
docker compose up -d --build
```

API Gateway akan aktif dan siap menerima request di:
`http://localhost:8080`

Periksa kesehatan service:
```bash
curl http://localhost:8080/health
```

---

## 💻 Pengembangan Lokal (Local Development)

Jika Anda ingin menjalankan backend Go secara langsung di mesin lokal:

1. **Jalankan Database PostgreSQL & Redis via Docker**:
   ```bash
   docker compose up -d postgres redis
   ```

2. **Jalankan API Gateway**:
   ```bash
   cd api
   go run cmd/server/main.go
   ```

3. **Menjalankan Unit Test**:
   ```bash
   cd api
   go test ./... -v
   ```

---

## 📄 Konfigurasi Environment Variables

File `.env` digunakan untuk mengatur variabel lingkungan infrastruktur:

| Variable | Deskripsi | Default |
| :--- | :--- | :--- |
| `APP_ENV` | Mode aplikasi (`development` / `production` / `test`) | `development` |
| `SERVER_PORT` | Port HTTP Server | `8080` |
| `DATABASE_URL` | Connection string PostgreSQL | `postgres://postgres:postgres@localhost:5432/ai_gateway?sslmode=disable` |
| `REDIS_URL` | Connection string Redis | `redis://:redis@localhost:6379` |
| `JWT_SECRET` | Secret key untuk signing JWT Session | `your-jwt-secret-here` |
| `ENCRYPTION_KEY` | Key 32-byte untuk enkripsi AES-256-GCM API Key Provider | `your-encryption-key-here` |
| `HASH_KEY` | Key untuk hashing Gateway API Key | `your-hash-key-here` |

> 🔒 *Catatan: API Credentials milik AI Provider (seperti OpenAI/Anthropic keys) **tidak disimpan** di file `.env`, melainkan dikelola secara terenkripsi di dalam database via API/Dashboard.*

---

## 🔄 Pipeline CI/CD & Deployment

Project ini menggunakan **GitHub Actions** tunggal ([ci-cd.yml](file:///.github/workflows/ci-cd.yml)):

1. **Continuous Integration (CI)**:
   - Linting kode Go menggunakan `golangci-lint`.
   - Otomatisasi pengujian (`go test ./...`) menggunakan PostgreSQL 15 & Redis 7 service containers.
   - Verifikasi kompilasi biner Go & Docker build.
2. **Continuous Deployment (CD)**:
   - Build & Push Docker image ke **GitHub Container Registry** (`ghcr.io/roozylabs/ai-gateway-api:latest`).
   - SSH otomatis ke VPS untuk melakukan `git pull`, `docker compose pull`, dan `docker compose up -d`.

---

## 📚 Endpoint API Ringkas

| Method | Endpoint | Deskripsi | Autentikasi |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Healthcheck status API, DB, & Redis | Publik |
| `POST` | `/api/auth/login` | Login user | Publik |
| `GET` | `/api/providers` | Kelola AI Providers | Session |
| `POST` | `/api/providers/:id/credentials` | Tambah Credential Provider | Session |
| `GET` | `/api/policies` | Kelola Routing Policies | Session |
| `GET` | `/api/budgets` | Kelola AI Expenditure Budgets | Session |
| `GET` | `/api/routing/decisions` | Audit Trail Log Keputusan Smart Router | Session |
| `GET` | `/v1/models` | List daftar model AI aktif (termasuk `roozy-auto`) | Gateway Key (`Bearer gw_sk_...`) |
| `POST` | `/v1/chat/completions` | Inference API (Support Smart Router & Streaming) | Gateway Key (`Bearer gw_sk_...`) |

---

## 📝 Lisensi

Distribusikan di bawah lisensi [MIT License](LICENSE).
