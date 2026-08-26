# Task 4 Report: Rewrite Playground page with real streaming API

## Summary

Replaced the mock playground with real streaming LLM responses via the gateway proxy and real routing simulation decisions.

## Changes Made

### 1. `apps/app/stores/usePlaygroundStore.ts`
- Added `isStreaming: boolean` state (default: `false`)
- Added `setIsStreaming: (v: boolean) => void` setter

### 2. `apps/app/app/playground/page.tsx`
- **Routing simulation**: `handleExecute` now calls `apiSimulateRouting({ prompt })` to fetch real routing decisions from the backend before streaming
- **Streaming**: Replaced `setTimeout(600)` mock with real `fetch('/v1/chat/completions', { stream: true })` using `ReadableStream` reader — tokens accumulate in real-time via `setResponse`
- **Model selector**: Replaced hardcoded model list with dynamic list from `useModelsListQuery()` hook (renders `m.displayName` for each model)
- **Streaming state**: Removed local `loading` useState; uses `isStreaming` from Zustand store instead
- **Button state**: Button disabled when `isStreaming` is true; shows spinner during stream

## Acceptance Criteria Checklist

1. ✅ `isStreaming` state added to `usePlaygroundStore`
2. ✅ `handleExecute` calls `apiSimulateRouting` for routing decisions
3. ✅ `handleExecute` streams via `fetch('/v1/chat/completions')` with `ReadableStream`
4. ✅ Response accumulates tokens in real-time (`setResponse` called per token)
5. ✅ Model selector fetches from `useModelsListQuery`
6. ✅ No mock `setTimeout` data
7. ✅ Build succeeds (`npx next build` passes)
8. ✅ One commit: `feat(playground): wire real streaming LLM responses via gateway proxy`

## Commit

- `f7246e1` — `feat(playground): wire real streaming LLM responses via gateway proxy`

## Build Result

Build passed successfully with no TypeScript errors.

---

## Review Fixes (Task 4)

### Fix 1: Dynamic model name in toast (line 87)
**Before:** `toast.success('Prompt executed successfully via prism-auto!')` — hardcoded regardless of selected model.
**After:** `toast.success(\`Prompt executed successfully via ${model}!\`)` — uses the current `model` value from the Zustand store.

### Fix 2: Fetch error guard (lines 60–63)
**Before:** Non-200 responses and network failures silently produced an empty reader loop.
**After:** Added `if (!res.ok)` check after fetch; reads the error body and throws, which is caught by a new `catch` block (lines 88–90) that shows `toast.error` with the failure message. Network errors (DNS, timeout, etc.) are also caught here.

### Commit
- `fix(playground): use dynamic model name in toast and guard fetch errors`

### Build Result
Build passed (`npx next build`) — no TypeScript or compilation errors.
