package proxy

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

type AnthropicAdapter struct{}

func NewAnthropicAdapter() *AnthropicAdapter {
	return &AnthropicAdapter{}
}

func (a *AnthropicAdapter) BuildRequest(baseURL, apiKey string, req *ProviderRequest) (*http.Request, error) {
	var systemPrompt string
	var messages []map[string]interface{}

	for _, msg := range req.Messages {
		if role, ok := msg["role"].(string); ok && role == "system" {
			if content, ok := msg["content"].(string); ok {
				systemPrompt = content
			}
			continue
		}
		messages = append(messages, msg)
	}

	body := map[string]interface{}{
		"model":    req.Model,
		"messages": messages,
		"stream":   req.Stream,
	}
	if systemPrompt != "" {
		body["system"] = systemPrompt
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

	url := strings.TrimRight(baseURL, "/") + "/v1/messages"
	httpReq, err := http.NewRequest("POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")
	return httpReq, nil
}

func (a *AnthropicAdapter) ParseResponse(body io.Reader) (*ProviderResponse, error) {
	var raw struct {
		ID    string `json:"id"`
		Model string `json:"model"`
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
		StopReason string `json:"stop_reason"`
		Usage      struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
		Error *struct {
			Type    string `json:"type"`
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.NewDecoder(body).Decode(&raw); err != nil {
		return nil, err
	}

	resp := &ProviderResponse{
		ID:    raw.ID,
		Model: raw.Model,
		Usage: Usage{
			PromptTokens:     raw.Usage.InputTokens,
			CompletionTokens: raw.Usage.OutputTokens,
			TotalTokens:      raw.Usage.InputTokens + raw.Usage.OutputTokens,
		},
	}

	if raw.Error != nil {
		resp.Error = &ProviderError{
			Type:    raw.Error.Type,
			Message: raw.Error.Message,
		}
		return resp, nil
	}

	var textContent string
	for _, c := range raw.Content {
		if c.Type == "text" {
			textContent += c.Text
		}
	}

	resp.Choices = append(resp.Choices, Choice{
		Index: 0,
		Message: map[string]interface{}{
			"role":    "assistant",
			"content": textContent,
		},
		FinishReason: raw.StopReason,
	})

	return resp, nil
}

func (a *AnthropicAdapter) ParseStreamChunk(line []byte) (*ProviderResponse, bool) {
	lineStr := strings.TrimSpace(string(line))
	if !strings.HasPrefix(lineStr, "data:") {
		return nil, false
	}
	data := strings.TrimSpace(strings.TrimPrefix(lineStr, "data:"))

	var event struct {
		Type  string          `json:"type"`
		Delta json.RawMessage `json:"delta"`
	}

	if err := json.Unmarshal([]byte(data), &event); err != nil {
		return nil, false
	}

	switch event.Type {
	case "message_start":
		var msg struct {
			Usage struct {
				InputTokens int `json:"input_tokens"`
			} `json:"usage"`
		}
		_ = json.Unmarshal(event.Delta, &msg)
		return &ProviderResponse{
			Usage: Usage{PromptTokens: msg.Usage.InputTokens},
		}, false

	case "content_block_delta":
		var delta struct {
			Type string `json:"type"`
			Text string `json:"text"`
		}
		_ = json.Unmarshal(event.Delta, &delta)
		return &ProviderResponse{
			Choices: []Choice{{
				Index: 0,
				Delta: map[string]interface{}{
					"role":    "assistant",
					"content": delta.Text,
				},
			}},
		}, false

	case "message_delta":
		var delta struct {
			StopReason string `json:"stop_reason"`
			Usage      struct {
				OutputTokens int `json:"output_tokens"`
			} `json:"usage"`
		}
		_ = json.Unmarshal(event.Delta, &delta)
		return &ProviderResponse{
			Choices: []Choice{{
				Index:        0,
				FinishReason: delta.StopReason,
			}},
			Usage: Usage{CompletionTokens: delta.Usage.OutputTokens},
		}, false

	case "message_stop":
		return nil, true

	default:
		return nil, false
	}
}

func (a *AnthropicAdapter) SupportsStreaming() bool {
	return true
}
