package proxy

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
)

type GoogleAdapter struct {
	openAI OpenAIAdapter
}

func NewGoogleAdapter() *GoogleAdapter {
	return &GoogleAdapter{
		openAI: OpenAIAdapter{},
	}
}

func (a *GoogleAdapter) BuildRequest(baseURL, apiKey string, req *ProviderRequest) (*http.Request, error) {
	u, err := url.Parse(baseURL)
	if err != nil {
		return nil, fmt.Errorf("invalid base URL: %w", err)
	}

	// Ensure path routes to /v1beta/openai/chat/completions
	if !strings.Contains(u.Path, "/v1beta/openai") {
		u.Path = path.Join(u.Path, "v1beta", "openai", "chat", "completions")
	} else if !strings.HasSuffix(u.Path, "/chat/completions") {
		u.Path = path.Join(u.Path, "chat", "completions")
	}

	body := map[string]interface{}{
		"model":    req.Model,
		"messages": req.Messages,
		"stream":   req.Stream,
	}
	if req.Stream {
		body["stream_options"] = map[string]interface{}{
			"include_usage": true,
		}
	}
	if req.MaxTokens > 0 {
		body["max_tokens"] = req.MaxTokens
	}
	if req.Temperature > 0 {
		body["temperature"] = req.Temperature
	}
	for k, v := range req.Extra {
		body[k] = v
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest("POST", u.String(), bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	return httpReq, nil
}

func (a *GoogleAdapter) ParseResponse(body io.Reader) (*ProviderResponse, error) {
	return a.openAI.ParseResponse(body)
}

func (a *GoogleAdapter) ParseStreamChunk(line []byte) (*ProviderResponse, bool) {
	return a.openAI.ParseStreamChunk(line)
}

func (a *GoogleAdapter) SupportsStreaming() bool {
	return true
}
