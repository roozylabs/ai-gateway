# 📎 Paperclip Agent Integration Guide for RoozyLabs Prism

This guide explains how to configure **Paperclip** agents (**Roozy**, **Eleana**, **Developer Agents**) to connect seamlessly to **RoozyLabs Prism** using the **`prism-auto`** Smart Router and avoid common workspace path execution errors on Windows.

---

## 🛠️ 1. Paperclip Adapter Configuration

In your Paperclip Console (`http://localhost:3100 > Agents > [Agent Name] > Configuration > Adapter`):

| Setting | Value | Description |
| :--- | :--- | :--- |
| **Adapter Type** | `Roozy AI Gateway` (or `OpenAI Compatible`) | Standard OpenAI API protocol |
| **Gateway URL** | `https://api.prism.roozylabs.com` | Live Prism Model Gateway API Proxy |
| **Gateway API Key** | `gw_sk_prism_...` | Your Prism Gateway API Key |
| **Model** | **`prism-auto`** | Dynamic Smart Router model |
| **Custom Headers** | `X-Prism-Agent-ID: roozy-ceo` | Agent identity tracking header |

---

## ⚠️ 2. Resolving Missing Disposition & Workspace Path Errors

### Problem in Screenshot:
An agent attempted `find /workspace/prism -maxdepth 4 ...`, resulting in:
`Paperclip could not resolve this issue's missing disposition automatically.`

### Root Cause:
The LLM model inferred a generic Linux container path (`/workspace/prism`) because the system prompt or project configuration did not explicitly declare the local workspace root path for Windows (`C:\me\projects\ai-gateway`).

### Solution:

#### Option A: Update Paperclip Project Configuration
In Paperclip (`Projects > Prism > Configuration`):
- Set **Local Folder**: `C:\me\projects\ai-gateway`
- Add to **Agent Instructions / Prompt**:
  ```text
  System Operating System: Windows
  Workspace Root Directory: C:\me\projects\ai-gateway
  When running shell/bash tool calls, use relative paths from the workspace root (e.g. `git ls-files` or `dir`) instead of absolute hardcoded Linux paths like `/workspace/prism`.
  ```

#### Option B: Use Cross-Platform Tool Commands
Instruct Paperclip agents to use `git ls-files` or standard Node/Go CLI tools instead of Linux-only `find /workspace/prism`:

```bash
# Recommended cross-platform file listing for Paperclip agents:
git ls-files
```

---

## 🎯 3. Verification & Observability in Prism

Once configured:
1. Every task execution triggered by Paperclip agents will hit `https://api.prism.roozylabs.com/v1/chat/completions` with `"model": "prism-auto"`.
2. **Smart Router Decision**: Prism automatically classifies task intent, pre-filters ready credentials, and routes to the optimal provider (OpenAI, Anthropic, Google Gemini).
3. **Observability**:
   - Inspect active agent executions under **`https://app.prism.roozylabs.com/agents`**.
   - Inspect cryptographic SHA-256 execution logs under **`https://app.prism.roozylabs.com/audit-trail`**.
   - Monitor real-time streaming decisions on **`https://app.prism.roozylabs.com/logs`**.
