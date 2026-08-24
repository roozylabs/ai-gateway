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

	targetModel := req.Model
	if targetModel == "gemini-3.6-flash" || targetModel == "gemini-3.7-flash" || targetModel == "roozy-auto" || strings.HasPrefix(targetModel, "gemini-3.") {
		targetModel = "gemini-2.0-flash"
	}

	body := map[string]interface{}{
		"model":    targetModel,
		"messages": sanitizeMessagesForGoogle(req.Messages),
		"stream":   req.Stream,
	}
	if len(req.Tools) > 0 {
		body["tools"] = ConvertGenericToolsToOpenAI(req.Tools)
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

	// For API Keys (e.g. starting with AIzaSy or AQ.), append key query parameter & x-goog-api-key
	if strings.HasPrefix(apiKey, "AIzaSy") || strings.HasPrefix(apiKey, "AQ.") || !strings.Contains(apiKey, ".") {
		q := u.Query()
		q.Set("key", apiKey)
		u.RawQuery = q.Encode()
	}

	httpReq, err := http.NewRequest("POST", u.String(), bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if strings.HasPrefix(apiKey, "AIzaSy") || strings.HasPrefix(apiKey, "AQ.") || !strings.Contains(apiKey, ".") {
		httpReq.Header.Set("x-goog-api-key", apiKey)
	} else {
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}
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

func sanitizeMessagesForGoogle(messages []map[string]interface{}) []map[string]interface{} {
	if len(messages) == 0 {
		return messages
	}

	result := make([]map[string]interface{}, 0, len(messages))
	for _, msg := range messages {
		msgCopy := make(map[string]interface{})
		for k, v := range msg {
			msgCopy[k] = v
		}

		if toolCallsRaw, ok := msgCopy["tool_calls"]; ok && toolCallsRaw != nil {
			if toolCalls, ok := toolCallsRaw.([]interface{}); ok {
				newToolCalls := make([]interface{}, 0, len(toolCalls))
				for _, tcRaw := range toolCalls {
					if tcMap, ok := tcRaw.(map[string]interface{}); ok {
						tcCopy := make(map[string]interface{})
						for k, v := range tcMap {
							tcCopy[k] = v
						}

						// Check inner function object
						if fnRaw, ok := tcCopy["function"]; ok && fnRaw != nil {
							if fnMap, ok := fnRaw.(map[string]interface{}); ok {
								fnCopy := make(map[string]interface{})
								for k, v := range fnMap {
									fnCopy[k] = v
								}
								if sig, hasSig := fnCopy["thought_signature"]; !hasSig || sig == nil || sig == "" {
									fnCopy["thought_signature"] = "skip"
								}
								tcCopy["function"] = fnCopy
							}
						}

						if sig, hasSig := tcCopy["thought_signature"]; !hasSig || sig == nil || sig == "" {
							tcCopy["thought_signature"] = "skip"
						}
						newToolCalls = append(newToolCalls, tcCopy)
					} else {
						newToolCalls = append(newToolCalls, tcRaw)
					}
				}
				msgCopy["tool_calls"] = newToolCalls
			}
		}
		result = append(result, msgCopy)
	}
	return result
}
