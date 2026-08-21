# Semantic Router + Budget Manager — Implementation Plan

**Product:** AI Gateway
**Version:** 2026-Q3
**Date:** 2026-08-21
**Status:** Ready for Implementation

## Goal

Bangun dua capability baru ke AI Gateway:

1. **Semantic Router** — tentukan model/provider terbaik berdasarkan task type, complexity, dan routing policy
2. **Budget Manager + Auto-Downgrade** — kontrol biaya dengan threshold otomatis, downgrade model saat budget pressure

Keduanya memungkinkan client mengirim `"model": "roozy-auto"` dan gateway mengambil keputusan routing secara intelligent.

## Scope

- ✅ Semantic Router (task classification + weighted scoring)
- ✅ Budget Manager (per-user budgets + auto-downgrade)
- ✅ Routing Policies (cheap/balanced/quality + custom)
- ✅ Model Capability Registry (scores + pricing)
- ✅ Frontend (budget page, policy page, model capabilities, dashboard widget)
- ❌ Apify/tool execution (V2)
- ❌ Billing/payment (V2)
- ❌ Multi-tenant/organization (V3)

## Architecture

### Request Flow (Backend)

```
Client: POST /v1/chat/completions
        {"model": "roozy-auto", "messages": [...]}

Gateway:
  1. Authenticate (gateway key)
  2. Task Classifier → task=coding, complexity=medium
  3. Load Routing Policy → "balanced"
  4. Budget Check → status=healthy (72% used)
  5. Get enabled models from Model Registry
  6. Filter by hard constraints (context_window, max_cost)
  7. Score candidates (weighted sum)
  8. Select winner
  9. Route to provider → credential pool → execute
  10. Log routing decision
  11. Record usage event
```

### Auto-Downgrade Flow

```
Budget Status: critical (92% used)

Request: coding task
Normal route: claude-sonnet ($15/1M output)
Budget pressure: FILTER OUT expensive models

Downgraded route: gemini-flash ($0.30/1M output)
Savings: 98% per request
```

---

## Implementation Order

### Phase 1: Frontend (14-18 jam)

Dikerjakan duluan karena ini tool internal — UI langsung berguna meskipun backend belum lengkap.

| Task | Effort | Deskripsi |
|------|--------|-----------|
| 1.1 | 2 jam | Budget Management page (`/budgets`) |
| 1.2 | 2 jam | Routing Policy page (`/policies`) |
| 1.3 | 1.5 jam | Model capability editing (extend `/models`) |
| 1.4 | 1 jam | Budget status widget di dashboard |
| 1.5 | 1 jam | `roozy-auto` di gateway keys + sandbox |
| 1.6 | 0.5 jam | Sidebar nav update |
| 1.7 | 1 jam | API client functions + TypeScript interfaces |
| 1.8 | 2 jam | Routing decision viewer (extend `/logs`) |
| 1.9 | 3 jam | QA, responsive, edge cases |

**Subtotal: 14-18 jam**

### Phase 2: Backend — Model Registry (3-4 jam)

| Task | Effort | Deskripsi |
|------|--------|-----------|
| 2.1 | 1 jam | Migration `027_add_model_capabilities` |
| 2.2 | 1 jam | Update Model struct + repository queries |
| 2.3 | 1 jam | Capability update endpoint (`PATCH .../capabilities`) |
| 2.4 | 0.5 jam | Seed scores untuk model existing |

**Subtotal: 3.5 jam**

### Phase 3: Backend — Task Classifier (2-3 jam)

| Task | Effort | Deskripsi |
|------|--------|-----------|
| 3.1 | 1.5 jam | Classifier (heuristic, deterministic) |
| 3.2 | 1 jam | Unit tests classifier |
| 3.3 | 0.5 jam | Integrate ke engine |

**Subtotal: 3 jam**

### Phase 4: Backend — Routing Policies + Scoring (4-6 jam)

| Task | Effort | Deskripsi |
|------|--------|-----------|
| 4.1 | 1 jam | Migration `028_create_routing_policies` + seed |
| 4.2 | 1 jam | Policy model + repository |
| 4.3 | 2 jam | Scoring engine + tests |
| 4.4 | 1.5 jam | `ResolveSemantic()` di router |

**Subtotal: 5.5 jam**

### Phase 5: Backend — Budget Manager + Auto-Downgrade (6-8 jam)

| Task | Effort | Deskripsi |
|------|--------|-----------|
| 5.1 | 1 jam | Migration `029_create_budgets` |
| 5.2 | 1 jam | Budget model + repository |
| 5.3 | 1.5 jam | Budget status calculator |
| 5.4 | 2 jam | Auto-downgrade scoring |
| 5.5 | 1.5 jam | Integrasi request flow + routing decision log |

**Subtotal: 7 jam**

### Phase 6: Backend — API Endpoints (3-4 jam)

| Task | Effort | Deskripsi |
|------|--------|-----------|
| 6.1 | 1.5 jam | Budget CRUD handler |
| 6.2 | 1 jam | Policy CRUD handler |
| 6.3 | 0.5 jam | Wiring di main.go |

**Subtotal: 3 jam**

---

## Total Effort

| Phase | Hours |
|-------|-------|
| Phase 1: Frontend | 14-18 |
| Phase 2: Model Registry | 3.5 |
| Phase 3: Task Classifier | 3 |
| Phase 4: Routing Policies + Scoring | 5.5 |
| Phase 5: Budget Manager + Downgrade | 7 |
| Phase 6: API Endpoints | 3 |
| **Total** | **36-40 jam** |

---

## Success Criteria

| Metrik | Target |
|--------|--------|
| Budget page functional (CRUD + status) | User bisa create/view/edit/delete budget |
| Policy page functional (CRUD + weights) | User bisa create/view/edit/delete policy |
| Model capability editable dari dashboard | User bisa update scores + pricing |
| Budget widget di dashboard | Real-time spend + remaining + status |
| `roozy-auto` visible di gateway keys | User bisa pilih auto model |
| `roozy-auto` akurasi pilih model (backend) | > 90% untuk coding tasks |
| Auto-downgrade trigger di ≥90% budget | Verified via budget status |
| Routing decision logged | 100% coverage untuk `roozy-auto` |
