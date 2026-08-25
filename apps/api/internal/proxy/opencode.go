package proxy

import (
	"io"
	"net/http"
	"strings"
)

type OpenCodeAdapter struct {
	baseURL    string
	subAdapter ProviderAdapter
}

func NewOpenCodeAdapter() *OpenCodeAdapter {
	return &OpenCodeAdapter{}
}

func (a *OpenCodeAdapter) detectAdapter(model, baseURL string) ProviderAdapter {
	lower := strings.ToLower(model)

	switch {
	case strings.HasPrefix(lower, "gpt-") ||
		strings.HasPrefix(lower, "grok-") ||
		strings.HasPrefix(lower, "muse-"):
		return NewOpenAIResponsesAdapter()

	case strings.HasPrefix(lower, "claude-") ||
		strings.HasPrefix(lower, "qwen3") ||
		strings.HasPrefix(lower, "big-pickle") ||
		strings.Contains(lower, "pickle"):
		return NewAnthropicAdapter()

	case strings.HasPrefix(lower, "minimax-"):
		if strings.Contains(baseURL, "/go") {
			return NewAnthropicAdapter()
		}
		return NewOpenAIAdapter()

	default:
		return NewOpenAIAdapter()
	}
}

func (a *OpenCodeAdapter) BuildRequest(baseURL, apiKey string, req *ProviderRequest) (*http.Request, error) {
	a.baseURL = baseURL
	a.subAdapter = a.detectAdapter(req.Model, baseURL)
	httpReq, err := a.subAdapter.BuildRequest(baseURL, apiKey, req)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("User-Agent", "opencode-cli/1.0")
	httpReq.Header.Set("x-api-key", apiKey)
	if req.Stream {
		httpReq.Header.Set("Accept", "text/event-stream")
	}
	return httpReq, nil
}

func (a *OpenCodeAdapter) ParseResponse(body io.Reader) (*ProviderResponse, error) {
	if a.subAdapter == nil {
		a.subAdapter = NewOpenAIAdapter()
	}
	return a.subAdapter.ParseResponse(body)
}

func (a *OpenCodeAdapter) ParseStreamChunk(line []byte) (*ProviderResponse, bool) {
	if a.subAdapter == nil {
		a.subAdapter = NewOpenAIAdapter()
	}
	return a.subAdapter.ParseStreamChunk(line)
}

func (a *OpenCodeAdapter) SupportsStreaming() bool {
	return true
}
