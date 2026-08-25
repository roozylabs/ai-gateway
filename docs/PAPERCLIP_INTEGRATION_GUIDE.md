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

## 💬 4. Resolving "Run completed. Agent did not post a summary comment" Notice

### Problem:
Paperclip Board displays:
`Run completed. Agent did not post a summary comment this run (transcript withheld — see run log).`

### Cause in Paperclip (`heartbeat-run-summary.ts`):
When a stateless adapter (like `prism-roozylabs`) returns a summary, Paperclip inspects `resultJson.summary`. Paperclip withholds the summary if:
1. **Length > 1,200 characters** (`MAX_FALLBACK_COMMENT_CHARS`).
2. **Starts with Narration Openers** (e.g. `Let me...`, `I'll...`, `First,...`, `Checking...`).

### Recommended Solutions:

#### Solution A: Add Prompt Rule for Concise Output Format
Add this rule to your Agent System Prompt / Skill instructions:
```text
Formatting Rule for Task Completion:
- Always format your final response as a concise summary under 1,000 characters.
- Do NOT start your final response with narration openers like "Let me...", "First,...", "I'll...", or "Checking...".
- Start directly with key result bullets (e.g. "### Summary of Work Completed:").
```

#### Solution B: Explicit Comment API Tool Call
Instruct Paperclip agents to invoke Paperclip's comment API before ending the run:
```bash
POST /api/issues/:issue_id/comments
Content-Type: application/json

{ "body": "### Run Summary\n- Task completed successfully.\n- Updated PRD and skills." }
```

---

## 🎯 5. Verification & Observability in Prism

Once configured:
1. Every task execution triggered by Paperclip agents will hit `https://api.prism.roozylabs.com/v1/chat/completions` with `"model": "prism-auto"`.
2. **Smart Router Decision**: Prism automatically classifies task intent, pre-filters ready credentials, and routes to the optimal provider (OpenAI, Anthropic, Google Gemini).
3. **Observability**:
   - Inspect active agent executions under **`https://app.prism.roozylabs.com/agents`**.
   - Inspect cryptographic SHA-256 execution logs under **`https://app.prism.roozylabs.com/audit-trail`**.
   - Monitor real-time streaming decisions on **`https://app.prism.roozylabs.com/logs`**.
