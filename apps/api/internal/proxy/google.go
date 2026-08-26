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

func SanitizeMessagesForGoogle(messages []map[string]interface{}) []map[string]interface{} {
	if len(messages) == 0 {
		return messages
	}

	result := make([]map[string]interface{}, 0, len(messages))
	for _, msg := range messages {
		msgCopy := make(map[string]interface{})
		for k, v := range msg {
			msgCopy[k] = v
		}

		// 1. Handle tool_calls array
		if toolCallsRaw, ok := msgCopy["tool_calls"]; ok && toolCallsRaw != nil {
			var newToolCalls []interface{}
			if toolCalls, ok := toolCallsRaw.([]interface{}); ok {
				newToolCalls = make([]interface{}, 0, len(toolCalls))
				for _, tcRaw := range toolCalls {
					newToolCalls = append(newToolCalls, sanitizeToolCallItem(tcRaw))
				}
			} else if toolCalls, ok := toolCallsRaw.([]map[string]interface{}); ok {
				newToolCalls = make([]interface{}, 0, len(toolCalls))
				for _, tcMap := range toolCalls {
					newToolCalls = append(newToolCalls, sanitizeToolCallMap(tcMap))
				}
			}
			if newToolCalls != nil {
				msgCopy["tool_calls"] = newToolCalls
			}
		}

		// 2. Handle legacy single function_call (snake_case)
		if fnCallRaw, ok := msgCopy["function_call"]; ok && fnCallRaw != nil {
			if fnCallMap, ok := fnCallRaw.(map[string]interface{}); ok {
				msgCopy["function_call"] = sanitizeToolCallMap(fnCallMap)
			}
		}

		// 3. Handle camelCase functionCall
		if fnCallRaw, ok := msgCopy["functionCall"]; ok && fnCallRaw != nil {
			if fnCallMap, ok := fnCallRaw.(map[string]interface{}); ok {
				msgCopy["functionCall"] = sanitizeToolCallMap(fnCallMap)
			}
		}

		// 4. Handle direct function call at message level
		if _, hasName := msgCopy["name"]; hasName {
			if _, hasArgs := msgCopy["args"]; hasArgs {
				msgCopy = sanitizeToolCallMap(msgCopy)
			} else if _, hasArgs := msgCopy["arguments"]; hasArgs {
				msgCopy = sanitizeToolCallMap(msgCopy)
			} else if _, hasInput := msgCopy["input"]; hasInput {
				msgCopy = sanitizeToolCallMap(msgCopy)
			}
		}

		// 5. Handle parts array (Gemini format)
		if partsRaw, ok := msgCopy["parts"]; ok && partsRaw != nil {
			if parts, ok := partsRaw.([]interface{}); ok {
				newParts := make([]interface{}, 0, len(parts))
				for _, partRaw := range parts {
					if partMap, ok := partRaw.(map[string]interface{}); ok {
						pCopy := make(map[string]interface{})
						for k, v := range partMap {
							pCopy[k] = v
						}
						if fnCallRaw, ok := pCopy["functionCall"]; ok && fnCallRaw != nil {
							if fnCallMap, ok := fnCallRaw.(map[string]interface{}); ok {
								pCopy["functionCall"] = sanitizeToolCallMap(fnCallMap)
							}
						}
						if fnCallRaw, ok := pCopy["function_call"]; ok && fnCallRaw != nil {
							if fnCallMap, ok := fnCallRaw.(map[string]interface{}); ok {
								pCopy["function_call"] = sanitizeToolCallMap(fnCallMap)
							}
						}
						if _, hasName := pCopy["name"]; hasName {
							pCopy = sanitizeToolCallMap(pCopy)
						}
						newParts = append(newParts, pCopy)
					} else {
						newParts = append(newParts, partRaw)
					}
				}
				msgCopy["parts"] = newParts
			}
		}

		// 6. Handle content array (multimodal / content blocks)
		if contentRaw, ok := msgCopy["content"]; ok && contentRaw != nil {
			if contentBlocks, ok := contentRaw.([]interface{}); ok {
				newContent := make([]interface{}, 0, len(contentBlocks))
				for _, blockRaw := range contentBlocks {
					if blockMap, ok := blockRaw.(map[string]interface{}); ok {
						bCopy := make(map[string]interface{})
						for k, v := range blockMap {
							bCopy[k] = v
						}
						if fnCallRaw, ok := bCopy["function_call"]; ok && fnCallRaw != nil {
							if fnCallMap, ok := fnCallRaw.(map[string]interface{}); ok {
								bCopy["function_call"] = sanitizeToolCallMap(fnCallMap)
							}
						}
						if fnCallRaw, ok := bCopy["functionCall"]; ok && fnCallRaw != nil {
							if fnCallMap, ok := fnCallRaw.(map[string]interface{}); ok {
								bCopy["functionCall"] = sanitizeToolCallMap(fnCallMap)
							}
						}
						if tcRaw, ok := bCopy["tool_calls"]; ok && tcRaw != nil {
							if tcs, ok := tcRaw.([]interface{}); ok {
								var newTcs []interface{}
								for _, tc := range tcs {
									newTcs = append(newTcs, sanitizeToolCallItem(tc))
								}
								bCopy["tool_calls"] = newTcs
							}
						}
						if _, hasName := bCopy["name"]; hasName {
							bCopy = sanitizeToolCallMap(bCopy)
						}
						newContent = append(newContent, bCopy)
					} else {
						newContent = append(newContent, blockRaw)
					}
				}
				msgCopy["content"] = newContent
			}
		}

		result = append(result, msgCopy)
	}
	return result
}

func sanitizeToolCallItem(tcRaw interface{}) interface{} {
	if tcMap, ok := tcRaw.(map[string]interface{}); ok {
		return sanitizeToolCallMap(tcMap)
	}
	return tcRaw
}

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

func sanitizeToolCallMap(tcMap map[string]interface{}) map[string]interface{} {
	tcCopy := make(map[string]interface{})
	for k, v := range tcMap {
		tcCopy[k] = v
	}

	const sentinel = "skip_thought_signature_validator"

	setSignature := func(m map[string]interface{}) {
		if sig, hasSig := m["thought_signature"]; !hasSig || isInvalidSignature(sig) {
			m["thought_signature"] = sentinel
		}
		if sig, hasSig := m["thoughtSignature"]; !hasSig || isInvalidSignature(sig) {
			m["thoughtSignature"] = sentinel
		}
	}

	setSignature(tcCopy)

	if fnRaw, ok := tcCopy["function"]; ok && fnRaw != nil {
		if fnMap, ok := fnRaw.(map[string]interface{}); ok {
			fnCopy := make(map[string]interface{})
			for k, v := range fnMap {
				fnCopy[k] = v
			}
			setSignature(fnCopy)
			tcCopy["function"] = fnCopy
		}
	}

	if fnRaw, ok := tcCopy["function_call"]; ok && fnRaw != nil {
		if fnMap, ok := fnRaw.(map[string]interface{}); ok {
			tcCopy["function_call"] = sanitizeToolCallMap(fnMap)
		}
	}

	if fnRaw, ok := tcCopy["functionCall"]; ok && fnRaw != nil {
		if fnMap, ok := fnRaw.(map[string]interface{}); ok {
			tcCopy["functionCall"] = sanitizeToolCallMap(fnMap)
		}
	}

	for _, metaKey := range []string{"extra", "provider_metadata", "providerMetadata"} {
		if metaRaw, ok := tcCopy[metaKey]; ok && metaRaw != nil {
			if metaMap, ok := metaRaw.(map[string]interface{}); ok {
				metaCopy := make(map[string]interface{})
				for k, v := range metaMap {
					metaCopy[k] = v
				}
				setSignature(metaCopy)
				tcCopy[metaKey] = metaCopy
			}
		}
	}

	return tcCopy
}
