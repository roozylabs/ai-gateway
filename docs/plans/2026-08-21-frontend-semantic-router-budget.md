# Frontend Plan: Semantic Router + Budget Manager UI

**Product:** AI Gateway
**Version:** 2026-Q3
**Date:** 2026-08-21
**Status:** Ready for Implementation

## Context

AI Gateway perlu UI baru untuk dua capability: **Budget Management** dan **Routing Policy Management**. Backend API endpoints belum ada, tapi frontend bisa dibangun terlebih dahulu dengan mock data / optimistic update, lalu di-wire ke backend setelah Phase 2-6 selesai.

## Tech Stack (Existing)

- Next.js 15 + React 19
- Ant Design v5.24
- TanStack Query v5
- Axios
- Custom atoms: `DataTable`, `PageHeader`, `MetricCard`, `StatusTag`, `ConfirmButton`

## Plan

---

### Task 1: API Client Functions + TypeScript Interfaces

**Files:**
- Modify: `app/lib/api.ts`

**Interfaces to add:**

```typescript
// Budget
interface ApiBudget {
  id: string
  name: string
  monthlyLimit: number
  dailyLimit: number
  hardLimit: boolean
  warningThreshold: number  // 0.0-1.0
  criticalThreshold: number // 0.0-1.0
  enabled: boolean
  createdAt: string
  updatedAt: string
}

interface ApiBudgetStatus {
  budget: ApiBudget | null
  monthlySpent: number
  dailySpent: number
  monthlyRemaining: number
  dailyRemaining: number
  usagePercent: number
  status: 'healthy' | 'warning' | 'critical' | 'exceeded'
}

// Routing Policy
interface ApiRoutingPolicy {
  id: string
  name: string
  weights: {
    task_match: number
    quality: number
    cost: number
    speed: number
  }
  constraints: {
    max_cost_per_request: number
  }
  enabled: boolean
  createdAt: string
  updatedAt: string
}

// Model Capability
interface ApiModelCapability {
  contextWindow: number
  codingScore: number
  reasoningScore: number
  writingScore: number
  speedScore: number
  qualityScore: number
  inputPricePer1M: number
  outputPricePer1M: number
  supportsTools: boolean
  supportsVision: boolean
}

// Routing Decision
interface ApiRoutingDecision {
  id: string
  requestId: string
  taskType: string
  complexity: string
  policyName: string
  candidates: string[]
  selectedModel: string
  selectedProvider: string
  budgetStatus: string
  estimatedCost: number
  actualCost: number
  downgradeReason: string
  createdAt: string
}
```

**API functions to add:**

```typescript
// Budgets
apiGetBudgets(): Promise<ApiBudget[]>
apiGetBudgetStatus(): Promise<ApiBudgetStatus>
apiCreateBudget(data): Promise<ApiBudget>
apiUpdateBudget(id, data): Promise<ApiBudget>
apiDeleteBudget(id): Promise<void>

// Policies
apiGetPolicies(): Promise<ApiRoutingPolicy[]>
apiCreatePolicy(data): Promise<ApiRoutingPolicy>
apiUpdatePolicy(id, data): Promise<ApiRoutingPolicy>
apiDeletePolicy(id): Promise<void>

// Model Capabilities
apiUpdateModelCapabilities(providerId, modelId, data): Promise<void>

// Routing Decisions
apiGetRoutingDecisions(params): Promise<ApiRoutingDecision[]>
```

---

### Task 2: Budget Management Page

**Files:**
- Create: `app/app/budgets/page.tsx`

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ Budgets                                             │
│ Kelola anggaran AI usage per bulan dan per hari      │
│                                              [+ Add]│
├─────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 📊 Budget Overview                               │ │
│ │                                                  │ │
│ │ Monthly Budget: $74.32 / $100.00                 │ │
│ │ ████████████████████░░░░░░░░ 74.3%               │ │
│ │ Projected: $91.40  Status: ⚠️ Warning             │ │
│ │                                                  │ │
│ │ Daily Budget: $3.20 / $10.00                     │ │
│ │ ████████░░░░░░░░░░░░░░░░░░░░ 32.0%               │ │
│ │ Status: ✅ Healthy                               │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Budget Rules                                     │ │
│ │                                                  │ │
│ │ Name      Period   Limit     Spent   Status     │ │
│ │ Monthly   Monthly  $100.00   $74.32  ⚠️ Warning  │ │
│ │ Daily     Daily    $10.00    $3.20   ✅ Healthy  │ │
│ │                                                  │ │
│ │ [Edit] [Delete]                                  │ │
│ └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Components:**
- `BudgetOverviewCard` — progress bar + status (reuse `MetricCard` pattern)
- `BudgetTable` — `DataTable` with columns: Name, Period, Limit, Spent, Remaining, Status, Actions
- `BudgetFormModal` — Create/Edit modal with form fields

**Form fields (Create/Edit):**
- Name (Input, required)
- Monthly Limit (InputNumber, USD)
- Daily Limit (InputNumber, USD)
- Hard Limit (Switch, default: true)
- Warning Threshold (Slider 0-100%, default 80%)
- Critical Threshold (Slider 0-100%, default 90%)

---

### Task 3: Routing Policy Page

**Files:**
- Create: `app/app/policies/page.tsx`

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ Routing Policies                                    │
│ Konfigurasi bagaimana gateway memilih model          │
│                                              [+ Add]│
├─────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Name       Task   Quality  Cost   Speed  Default │ │
│ │ cheap      25%    10%      60%    5%     ❌      │ │
│ │ balanced   35%    35%      15%    15%    ✅ (default)│
│ │ quality    35%    50%       5%    10%     ❌      │ │
│ │                                                  │ │
│ │ Constraints:                                     │ │
│ │ cheap: max $0.01/req                             │ │
│ │ balanced: max $0.05/req                          │ │
│ │ quality: max $0.20/req                           │ │
│ │                                                  │ │
│ │ [Edit] [Set Default] [Delete]                    │ │
│ └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Components:**
- `PolicyTable` — `DataTable` with columns: Name, Weights (visual bars), Constraints, Default, Actions
- `PolicyFormModal` — Create/Edit modal with weight sliders
- `WeightBar` — Visual representation of weight distribution (colored segments)

**Form fields (Create/Edit):**
- Name (Input, required)
- Task Match Weight (Slider 0-100)
- Quality Weight (Slider 0-100)
- Cost Weight (Slider 0-100)
- Speed Weight (Slider 0-100)
- Max Cost Per Request (InputNumber, USD)
- Set as Default (Switch)

**Validation:** Weights must sum to 1.0 (±0.01 tolerance)

---

### Task 4: Model Capability Editing

**Files:**
- Modify: `app/app/models/page.tsx`

**Changes:**
1. Add "Edit" action to existing table (currently only Delete)
2. Extend create/edit modal with capability fields
3. Add `roozy-auto` as special model entry

**New form sections in model modal:**

```
┌─────────────────────────────────────────┐
│ Model Capabilities (Advanced)           │
│ [Expand/Collapse]                       │
│                                         │
│ Context Window     [200000]             │
│                                          │
│ Scores (0.0 - 1.0):                     │
│ Coding    ████████░░ 0.95               │
│ Reasoning ████████░░ 0.92               │
│ Writing   ███████░░░ 0.90               │
│ Speed     ██████░░░░ 0.78               │
│ Quality   ████████░░ 0.93               │
│                                          │
│ Pricing (per 1M tokens):                │
│ Input     [$3.00]                        │
│ Output    [$15.00]                       │
│                                          │
│ Capabilities:                           │
│ [ ] Supports Tools (function calling)   │
│ [ ] Supports Vision (image input)       │
└─────────────────────────────────────────┘
```

---

### Task 5: Budget Status Widget on Dashboard

**Files:**
- Modify: `app/app/page.tsx`

**Changes:**
Add 5th `MetricCard` in the KPI row:

```
┌──────────────────┐
│ Budget Status    │
│ $74.32 / $100    │
│ ⚠️ Warning (74%) │
└──────────────────┘
```

**Data source:** `GET /api/budgets/status` (new endpoint)
**Fallback:** If no budget configured, show "No budget set" with link to `/budgets`

---

### Task 6: `roozy-auto` in Gateway Keys + Sandbox

**Files:**
- Modify: `app/app/gateway-keys/page.tsx`
- Modify: `app/app/sandbox/page.tsx`

**Changes:**

**Gateway Keys page:**
- In create form, add `allowedModels` multi-select with special option: `roozy-auto (Smart Routing)`
- In integration modal, include `roozy-auto` in model picker

**Sandbox page:**
- Add `roozy-auto` to model selector dropdown
- Show "Smart Routing" label when selected

---

### Task 7: Sidebar Navigation Update

**Files:**
- Modify: `app/components/AppLayout.tsx`

**Changes:**
Add new menu items:

```typescript
// Current menu structure
Gateway
├── API Keys
├── Models
└── Routing

Providers
├── All Providers
├── Credentials
└── Health

// New menu structure
Gateway
├── API Keys
├── Models
├── Routing
├── Budgets        ← NEW
└── Policies       ← NEW

Providers
├── All Providers
├── Credentials
└── Health
```

**Icons:** `WalletOutlined` for Budgets, `BranchesOutlined` for Policies

---

### Task 8: Routing Decision Viewer

**Files:**
- Modify: `app/app/logs/page.tsx`

**Changes:**
Add filter tabs or column for routing decisions:

```
┌─────────────────────────────────────────────────────┐
│ Request Logs                          [All] [Routing]│
├─────────────────────────────────────────────────────┤
│ Time     Model        Task     Policy    Budget   Cost│
│ 10:42    claude-sonnet coding  balanced  healthy  $0.03│
│ 10:41    gemini-flash writing cheap     critical $0.001│
└─────────────────────────────────────────────────────┘
```

**New columns (conditional):**
- Task Type (coding/reasoning/writing)
- Routing Policy used
- Budget Status at time of request
- Downgrade Reason (if any)

---

### Task 9: QA, Responsive, Edge Cases

- Test all CRUD operations (create, read, update, delete)
- Test budget status calculation display
- Test policy weight validation (must sum to 1.0)
- Test responsive layout on mobile
- Test empty states (no budgets, no policies, no decisions)
- Test error states (API failure)
- Test loading states
- Test `roozy-auto` selection in gateway keys
- Verify all new pages appear in sidebar navigation

---

## File Summary

| Action | File | Task |
|--------|------|------|
| Modify | `app/lib/api.ts` | Task 1 |
| Create | `app/app/budgets/page.tsx` | Task 2 |
| Create | `app/app/policies/page.tsx` | Task 3 |
| Modify | `app/app/models/page.tsx` | Task 4 |
| Modify | `app/app/page.tsx` | Task 5 |
| Modify | `app/app/gateway-keys/page.tsx` | Task 6 |
| Modify | `app/app/sandbox/page.tsx` | Task 6 |
| Modify | `app/components/AppLayout.tsx` | Task 7 |
| Modify | `app/app/logs/page.tsx` | Task 8 |

## Dependencies

```
Task 1 (API client) ──→ Task 2 (Budgets page)
                    ──→ Task 3 (Policies page)
                    ──→ Task 4 (Model capabilities)
                    ──→ Task 5 (Dashboard widget)
                    ──→ Task 6 (Gateway keys)
                    ──→ Task 8 (Decision viewer)

Task 7 (Sidebar) ──→ All new pages visible
```

## Effort Summary

| Task | Hours |
|------|-------|
| 1. API client + interfaces | 1 |
| 2. Budget page | 2 |
| 3. Policy page | 2 |
| 4. Model capabilities | 1.5 |
| 5. Dashboard widget | 1 |
| 6. Gateway keys + sandbox | 1 |
| 7. Sidebar nav | 0.5 |
| 8. Decision viewer | 2 |
| 9. QA + edge cases | 3 |
| **Total** | **14-15 jam** |
