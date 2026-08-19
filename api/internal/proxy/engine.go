package proxy

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/models"
	"github.com/roozylabs/ai-gateway/internal/repository"
)

type Engine struct {
	router    *Router
	creds     *repository.CredentialRepository
	encKey    string
	client    *http.Client
}

func NewEngine(router *Router, creds *repository.CredentialRepository, encKey string) *Engine {
	return &Engine{
		router: router,
		creds:  creds,
		encKey: encKey,
		client: &http.Client{Timeout: 5 * time.Minute},
	}
}

type ProxyRequest struct {
	Model       string                 `json:"model"`
	Messages    []map[string]interface{} `json:"messages"`
	Stream      bool                   `json:"stream"`
	MaxTokens   int                    `json:"max_tokens,omitempty"`
	Temperature float64                `json:"temperature,omitempty"`
	Extra       map[string]interface{} `json:"-"`
}

func (e *Engine) Proxy(c *gin.Context, req *ProxyRequest, gatewayKey *models.GatewayAPIKey) (*ProviderResponse, *models.RequestLog, error) {
	start := time.Now()

	route, err := e.router.Resolve(c.Request.Context(), req.Model, gatewayKey.AllowedModels)
	if err != nil {
		return nil, nil, err
	}

	apiKey, err := e.creds.DecryptKey(c.Request.Context(), route.Credential.ID, e.encKey)
	if err != nil {
		return nil, nil, fmt.Errorf("decrypt credential: %w", err)
	}

	providerReq := &ProviderRequest{
		Model:       req.Model,
		Messages:    req.Messages,
		Stream:      req.Stream,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
		Extra:       req.Extra,
	}

	httpReq, err := route.Adapter.BuildRequest(route.Provider.BaseURL, apiKey, providerReq)
	if err != nil {
		return nil, nil, fmt.Errorf("build request: %w", err)
	}

	httpResp, err := e.client.Do(httpReq)
	if err != nil {
		return nil, nil, fmt.Errorf("execute request: %w", err)
	}
	defer httpResp.Body.Close()

	body, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("read response: %w", err)
	}

	resp, err := route.Adapter.ParseResponse(bytes.NewReader(body))
	if err != nil {
		return nil, nil, fmt.Errorf("parse response: %w", err)
	}

	latency := int(time.Since(start).Milliseconds())

	log := &models.RequestLog{
		GatewayAPIKeyID: &gatewayKey.ID,
		ProviderID:      &route.Provider.ID,
		CredentialID:    &route.Credential.ID,
		Model:           req.Model,
		StatusCode:      httpResp.StatusCode,
		LatencyMs:       latency,
		InputTokens:     resp.Usage.PromptTokens,
		OutputTokens:    resp.Usage.CompletionTokens,
		TotalTokens:     resp.Usage.TotalTokens,
		RetryCount:      0,
	}

	if resp.Error != nil {
		log.ErrorMessage = resp.Error.Message
	}

	return resp, log, nil
}

func (e *Engine) ProxyStream(c *gin.Context, req *ProxyRequest, gatewayKey *models.GatewayAPIKey) (*models.RequestLog, error) {
	start := time.Now()

	route, err := e.router.Resolve(c.Request.Context(), req.Model, gatewayKey.AllowedModels)
	if err != nil {
		return nil, err
	}

	apiKey, err := e.creds.DecryptKey(c.Request.Context(), route.Credential.ID, e.encKey)
	if err != nil {
		return nil, fmt.Errorf("decrypt credential: %w", err)
	}

	providerReq := &ProviderRequest{
		Model:       req.Model,
		Messages:    req.Messages,
		Stream:      true,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
		Extra:       req.Extra,
	}

	httpReq, err := route.Adapter.BuildRequest(route.Provider.BaseURL, apiKey, providerReq)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}

	httpResp, err := e.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer httpResp.Body.Close()

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Status(http.StatusOK)

	var totalTokens Usage
	scanner := bufio.NewScanner(httpResp.Body)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		chunk, done := route.Adapter.ParseStreamChunk(line)
		if done {
			break
		}
		if chunk == nil {
			continue
		}

		if chunk.Usage.TotalTokens > 0 {
			totalTokens = chunk.Usage
		}

		jsonChunk, _ := json.Marshal(chunk)
		c.Writer.Write([]byte("data: "))
		c.Writer.Write(jsonChunk)
		c.Writer.Write([]byte("\n\n"))
		c.Writer.Flush()
	}

	c.Writer.Write([]byte("data: [DONE]\n\n"))
	c.Writer.Flush()

	latency := int(time.Since(start).Milliseconds())

	log := &models.RequestLog{
		GatewayAPIKeyID: &gatewayKey.ID,
		ProviderID:      &route.Provider.ID,
		CredentialID:    &route.Credential.ID,
		Model:           req.Model,
		StatusCode:      httpResp.StatusCode,
		LatencyMs:       latency,
		InputTokens:     totalTokens.PromptTokens,
		OutputTokens:    totalTokens.CompletionTokens,
		TotalTokens:     totalTokens.TotalTokens,
		RetryCount:      0,
	}

	return log, nil
}
