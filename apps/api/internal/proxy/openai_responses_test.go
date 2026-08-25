package proxy

import (
	"strings"
	"testing"
)

func TestOpenAIResponsesAdapter_ParseResponse(t *testing.T) {
	adapter := NewOpenAIResponsesAdapter()

	tax := `{
		"id": "resp_abc123",
		"model": "gpt-5.6-luna",
		"output": [
			{
				"type": "message",
				"content": [
					{
						"type": "output_text",
						"text": "Hello! How can I help you?"
					}
				]
			}
		],
		"usage": {
			"input_tokens": 12,
			"output_tokens": 8
		}
	}`

	resp, err := adapter.ParseResponse(strings.NewReader(tax))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.ID != "resp_abc123" {
		t.Errorf("expected ID resp_abc123, got %s", resp.ID)
	}
	if resp.Model != "gpt-5.6-luna" {
		t.Errorf("expected model gpt-5.6-luna, got %s", resp.Model)
	}
	if resp.Usage.PromptTokens != 12 {
		t.Errorf("expected 12 prompt tokens, got %d", resp.Usage.PromptTokens)
	}
	if resp.Usage.CompletionTokens != 8 {
		t.Errorf("expected 8 completion tokens, got %d", resp.Usage.CompletionTokens)
	}
	if len(resp.Choices) != 1 {
		t.Fatalf("expected 1 choice, got %d", len(resp.Choices))
	}
	if resp.Choices[0].Message["content"] != "Hello! How can I help you?" {
		t.Errorf("unexpected content: %v", resp.Choices[0].Message["content"])
	}
}

func TestOpenAIResponsesAdapter_ParseResponse_Error(t *testing.T) {
	adapter := NewOpenAIResponsesAdapter()

	tax := `{
		"error": {
			"message": "Invalid API key",
			"type": "authentication_error",
			"code": "invalid_api_key"
		}
	}`

	resp, err := adapter.ParseResponse(strings.NewReader(tax))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.Error == nil {
		t.Fatal("expected error, got nil")
	}
	if resp.Error.Message != "Invalid API key" {
		t.Errorf("expected error message 'Invalid API key', got %s", resp.Error.Message)
	}
}

func TestOpenAIResponsesAdapter_ParseStreamChunk(t *testing.T) {
	adapter := NewOpenAIResponsesAdapter()

	tax := []byte(`data: {"type":"response.output_text.delta","delta":{"content_index":0,"delta":"Hello"}}`)
	resp, done := adapter.ParseStreamChunk(tax)
	if done {
		t.Fatal("expected not done")
	}
	if resp == nil {
		t.Fatal("expected response, got nil")
	}
	if len(resp.Choices) != 1 {
		t.Fatalf("expected 1 choice, got %d", len(resp.Choices))
	}
	if resp.Choices[0].Delta["content"] != "Hello" {
		t.Errorf("expected delta content 'Hello', got %v", resp.Choices[0].Delta["content"])
	}
}

func TestOpenAIResponsesAdapter_ParseStreamChunk_Done(t *testing.T) {
	adapter := NewOpenAIResponsesAdapter()

	_, done := adapter.ParseStreamChunk([]byte("data: [DONE]"))
	if !done {
		t.Fatal("expected done=true")
	}
}

func TestOpenAIResponsesAdapter_BuildRequest(t *testing.T) {
	adapter := NewOpenAIResponsesAdapter()

	req := &ProviderRequest{
		Model: "gpt-5.6-luna",
		Messages: []map[string]interface{}{
			{"role": "user", "content": "Hi"},
		},
		Stream: false,
	}

	httpReq, err := adapter.BuildRequest("https://opencode.ai/zen", "sk-test", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if httpReq.Method != "POST" {
		t.Errorf("expected POST, got %s", httpReq.Method)
	}
	if !strings.HasSuffix(httpReq.URL.Path, "/v1/responses") {
		t.Errorf("expected path ending with /v1/responses, got %s", httpReq.URL.Path)
	}
	if httpReq.Header.Get("Authorization") != "Bearer sk-test" {
		t.Errorf("expected Bearer auth, got %s", httpReq.Header.Get("Authorization"))
	}
}

func TestOpenCodeAdapter_DetectAdapter(t *testing.T) {
	adapter := NewOpenCodeAdapter()

	tests := []struct {
		model    string
		baseURL  string
		expected string
	}{
		{"gpt-5.6-luna", "https://opencode.ai/zen", "*OpenAIResponsesAdapter"},
		{"grok-4.5", "https://opencode.ai/zen", "*OpenAIResponsesAdapter"},
		{"muse-spark-1.2", "https://opencode.ai/zen", "*OpenAIResponsesAdapter"},
		{"claude-opus-5", "https://opencode.ai/zen", "*AnthropicAdapter"},
		{"qwen3.7-max", "https://opencode.ai/zen", "*AnthropicAdapter"},
		{"deepseek-v4-pro", "https://opencode.ai/zen", "*OpenAIAdapter"},
		{"glm-5.2", "https://opencode.ai/zen", "*OpenAIAdapter"},
		{"kimi-k3", "https://opencode.ai/zen", "*OpenAIAdapter"},
		{"minimax-m3", "https://opencode.ai/zen", "*OpenAIAdapter"},
		{"minimax-m3", "https://opencode.ai/zen/go", "*AnthropicAdapter"},
	}

	for _, tt := range tests {
		a := adapter.detectAdapter(tt.model, tt.baseURL)
		got := typeOfAdapter(a)
		if got != tt.expected {
			t.Errorf("model=%s baseURL=%s: expected %s, got %s", tt.model, tt.baseURL, tt.expected, got)
		}
	}
}

func typeOfAdapter(a ProviderAdapter) string {
	switch a.(type) {
	case *OpenAIResponsesAdapter:
		return "*OpenAIResponsesAdapter"
	case *AnthropicAdapter:
		return "*AnthropicAdapter"
	case *OpenAIAdapter:
		return "*OpenAIAdapter"
	default:
		return "unknown"
	}
}
