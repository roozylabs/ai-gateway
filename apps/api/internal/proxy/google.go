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
	if targetModel == "" || targetModel == "prism-auto" || targetModel == "roozy-auto" || targetModel == "gemini-2.0-flash" {
		targetModel = "gemini-3.6-flash"
	}

	body := map[string]interface{}{
		"model":    targetModel,
		"messages": SanitizeMessagesForGoogle(req.Messages),
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
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("x-goog-api-key", apiKey)
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

const SentinelThoughtSignature = "skip_thought_signature_validator"

func isInvalidSignature(v interface{}) bool {
	if v == nil {
		return true
	}
	s, ok := v.(string)
	if !ok {
		return true
	}
	s = strings.TrimSpace(s)
	if s == "" || s == "skip" || s == "none" || s == "null" || s == "undefined" {
		return true
	}
	return false
}

func ensureSignature(m map[string]interface{}) {
	if sig, hasSig := m["thought_signature"]; !hasSig || isInvalidSignature(sig) {
		m["thought_signature"] = SentinelThoughtSignature
	}
	if sig, hasSig := m["thoughtSignature"]; !hasSig || isInvalidSignature(sig) {
		m["thoughtSignature"] = SentinelThoughtSignature
	}
}

func sanitizeArgumentsString(argsStr string) string {
	argsStr = strings.TrimSpace(argsStr)
	if argsStr == "" || argsStr == "{}" {
		return `{"thought_signature":"skip_thought_signature_validator","thoughtSignature":"skip_thought_signature_validator"}`
	}

	var m map[string]interface{}
	if err := json.Unmarshal([]byte(argsStr), &m); err != nil {
		return argsStr
	}

	ensureSignature(m)

	b, err := json.Marshal(m)
	if err != nil {
		return argsStr
	}
	return string(b)
}

// SanitizeValueRecursively recursively inspects and sanitizes any map or slice in the message payload.
func SanitizeValueRecursively(v interface{}) interface{} {
	if v == nil {
		return nil
	}

	switch val := v.(type) {
	case map[string]interface{}:
		return sanitizeMapRecursively(val)
	case []interface{}:
		newSlice := make([]interface{}, len(val))
		for i, item := range val {
			newSlice[i] = SanitizeValueRecursively(item)
		}
		return newSlice
	case []map[string]interface{}:
		newSlice := make([]interface{}, len(val))
		for i, item := range val {
			newSlice[i] = sanitizeMapRecursively(item)
		}
		return newSlice
	default:
		return v
	}
}

func sanitizeMapRecursively(m map[string]interface{}) map[string]interface{} {
	if m == nil {
		return nil
	}

	mCopy := make(map[string]interface{}, len(m))
	for k, v := range m {
		mCopy[k] = SanitizeValueRecursively(v)
	}

	// Always ensure signature on EVERY map in the message payload tree
	ensureSignature(mCopy)

	// Propagate signature directly to child maps & JSON string arguments
	for _, childKey := range []string{"args", "arguments", "input", "function", "functionCall", "function_call", "extra", "provider_metadata", "providerMetadata"} {
		if childRaw, ok := mCopy[childKey]; ok && childRaw != nil {
			if childMap, ok := childRaw.(map[string]interface{}); ok {
				ensureSignature(childMap)
			} else if childStr, ok := childRaw.(string); ok {
				mCopy[childKey] = sanitizeArgumentsString(childStr)
			}
		}
	}

	return mCopy
}

// SanitizeMessagesForGoogle ensures all tool calls across all messages contain thought_signature fields.
func SanitizeMessagesForGoogle(messages []map[string]interface{}) []map[string]interface{} {
	if len(messages) == 0 {
		return messages
	}

	result := make([]map[string]interface{}, 0, len(messages))
	for _, msg := range messages {
		sanitized := SanitizeValueRecursively(msg)
		if msgMap, ok := sanitized.(map[string]interface{}); ok {
			result = append(result, msgMap)
		} else {
			result = append(result, msg)
		}
	}
	return result
}
