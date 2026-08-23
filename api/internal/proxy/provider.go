package proxy

import (
	"io"
	"net/http"
)

type ProviderRequest struct {
	Model       string
	Messages    []map[string]interface{}
	Tools       []interface{}
	ToolChoice  interface{}
	Stream      bool
	MaxTokens   int
	Temperature float64
	Extra       map[string]interface{}
}

type ProviderResponse struct {
	ID      string         `json:"id,omitempty"`
	Model   string         `json:"model,omitempty"`
	Choices []Choice       `json:"choices"`
	Usage   Usage          `json:"usage,omitempty"`
	Error   *ProviderError `json:"error,omitempty"`
}

type Choice struct {
	Index        int                    `json:"index"`
	Message      map[string]interface{} `json:"message,omitempty"`
	Delta        map[string]interface{} `json:"delta,omitempty"`
	FinishReason string                 `json:"finish_reason,omitempty"`
}

type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type ProviderError struct {
	Type    string `json:"type,omitempty"`
	Message string `json:"message,omitempty"`
	Code    string `json:"code,omitempty"`
}

type ProviderAdapter interface {
	BuildRequest(baseURL, apiKey string, req *ProviderRequest) (*http.Request, error)
	ParseResponse(body io.Reader) (*ProviderResponse, error)
	ParseStreamChunk(line []byte) (*ProviderResponse, bool)
	SupportsStreaming() bool
}
