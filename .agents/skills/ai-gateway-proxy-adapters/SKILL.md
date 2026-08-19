---
name: ai-gateway-proxy-adapters
description: Guide for creating, modifying, and debugging LLM provider adapters in AI Gateway (/api/internal/proxy). Use when adding support for new AI providers, modifying request payloads, fixing SSE streaming chunks, or adjusting HTTP headers.
---

# AI Gateway Provider Adapters Guide

## 1. Adapter Interface Specification (`provider.go`)

Every upstream AI provider in AI Gateway implements the `ProviderAdapter` interface:

```go
type ProviderAdapter interface {
	BuildRequest(baseURL, apiKey string, req *ProviderRequest) (*http.Request, error)
	ParseResponse(body io.Reader) (*ProviderResponse, error)
	ParseStreamChunk(line []byte) (*ProviderResponse, bool)
	SupportsStreaming() bool
}
```

---

## 2. Implementing a New Adapter

1. Create a new file in `/api/internal/proxy/<provider_name>.go`.
2. Define the struct `type MyProviderAdapter struct{}` and factory `NewMyProviderAdapter()`.
3. Implement `BuildRequest`:
   - Construct HTTP POST request to target provider URL.
   - Inject required headers (`Content-Type: application/json`, `Authorization: Bearer <key>`, or provider-specific headers).
   - If provider requires specific User-Agent (like OpenCode Zen requiring `opencode-cli/1.0`), set `httpReq.Header.Set("User-Agent", "opencode-cli/1.0")`.
4. Implement `ParseResponse` (for non-streaming completions).
5. Implement `ParseStreamChunk` (for SSE streaming):
   - Parse SSE line bytes.
   - Return `(*ProviderResponse, bool)` where `bool` is `true` if stream has finished (`[DONE]`).
   - Ensure `Choices` field is never omitted so SSE JSON output matches OpenAI spec.
6. Register adapter in `Router.ResolveWithFallback` in `router.go`.
