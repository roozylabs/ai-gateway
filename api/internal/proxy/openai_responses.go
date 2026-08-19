package proxy

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

type OpenAIResponsesAdapter struct{}

func NewOpenAIResponsesAdapter() *OpenAIResponsesAdapter {
	return &OpenAIResponsesAdapter{}
}

func (a *OpenAIResponsesAdapter) BuildRequest(baseURL, apiKey string, req *ProviderRequest) (*http.Request, error) {
	var input interface{}

	if len(req.Messages) == 1 {
		if content, ok := req.Messages[0]["content"].(string); ok {
			input = content
		}
	}

	if input == nil {
		var items []map[string]interface{}
		for _, msg := range req.Messages {
			role, _ := msg["role"].(string)
			content, _ := msg["content"].(string)
			items = append(items, map[string]interface{}{
				"role":    role,
				"content": content,
			})
		}
		input = items
	}

	body := map[string]interface{}{
		"model":  req.Model,
		"input":  input,
		"stream": req.Stream,
	}

	for k, v := range req.Extra {
		body[k] = v
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	url := strings.TrimRight(baseURL, "/") + "/v1/responses"
	httpReq, err := http.NewRequest("POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	return httpReq, nil
}

func (a *OpenAIResponsesAdapter) ParseResponse(body io.Reader) (*ProviderResponse, error) {
	var raw struct {
		ID    string `json:"id"`
		Model string `json:"model"`
		Output []struct {
			Type    string `json:"type"`
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
		} `json:"output"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
		Error *struct {
			Message string `json:"message"`
			Type    string `json:"type"`
			Code    string `json:"code"`
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
			Code:    raw.Error.Code,
		}
		return resp, nil
	}

	var textContent string
	for _, item := range raw.Output {
		if item.Type == "message" {
			for _, c := range item.Content {
				if c.Type == "output_text" {
					textContent += c.Text
				}
			}
		}
	}

	resp.Choices = append(resp.Choices, Choice{
		Index: 0,
		Message: map[string]interface{}{
			"role":    "assistant",
			"content": textContent,
		},
		FinishReason: "stop",
	})

	return resp, nil
}

func (a *OpenAIResponsesAdapter) ParseStreamChunk(line []byte) (*ProviderResponse, bool) {
	lineStr := string(line)
	if !strings.HasPrefix(lineStr, "data: ") {
		return nil, false
	}
	data := strings.TrimPrefix(lineStr, "data: ")
	if data == "[DONE]" {
		return nil, true
	}

	var event struct {
		Type  string          `json:"type"`
		Delta json.RawMessage `json:"delta"`
	}

	if err := json.Unmarshal([]byte(data), &event); err != nil {
		return nil, false
	}

	switch event.Type {
	case "response.output_text.delta":
		var delta struct {
			ContentIndex int    `json:"content_index"`
			Delta        string `json:"delta"`
		}
		_ = json.Unmarshal(event.Delta, &delta)
		return &ProviderResponse{
			Choices: []Choice{{
				Index: 0,
				Delta: map[string]interface{}{
					"role":    "assistant",
					"content": delta.Delta,
				},
			}},
		}, false

	case "response.completed":
		var completed struct {
			Usage struct {
				InputTokens  int `json:"input_tokens"`
				OutputTokens int `json:"output_tokens"`
			} `json:"usage"`
		}
		_ = json.Unmarshal(event.Delta, &completed)
		return &ProviderResponse{
			Usage: Usage{
				PromptTokens:     completed.Usage.InputTokens,
				CompletionTokens: completed.Usage.OutputTokens,
				TotalTokens:      completed.Usage.InputTokens + completed.Usage.OutputTokens,
			},
		}, false

	default:
		return nil, false
	}
}

func (a *OpenAIResponsesAdapter) SupportsStreaming() bool {
	return true
}
