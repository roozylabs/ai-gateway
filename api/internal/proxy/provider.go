package proxy

import (
	"io"
	"net/http"
)

type ProviderRequest struct {
	Model       string
	Messages    []map[string]interface{}
	Stream      bool
	MaxTokens   int
	Temperature float64
	Extra       map[string]interface{}
}

type ProviderResponse struct {
	ID      string
	Model   string
	Choices []Choice
	Usage   Usage
	Error   *ProviderError
}

type Choice struct {
	Index        int
	Message      map[string]interface{}
	Delta        map[string]interface{}
	FinishReason string
}

type Usage struct {
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
}

type ProviderError struct {
	Type    string
	Message string
	Code    string
}

type ProviderAdapter interface {
	BuildRequest(baseURL, apiKey string, req *ProviderRequest) (*http.Request, error)
	ParseResponse(body io.Reader) (*ProviderResponse, error)
	ParseStreamChunk(line []byte) (*ProviderResponse, bool)
	SupportsStreaming() bool
}
