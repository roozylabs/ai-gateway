package proxy

import (
	"bufio"
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/models"
	goredis "github.com/roozylabs/ai-gateway/internal/redis"
	"github.com/roozylabs/ai-gateway/internal/repository"
)

type Engine struct {
	router       *Router
	creds        *repository.CredentialRepository
	cooldown     *goredis.CooldownStore
	encKey       string
	maxRetries   int
	cooldownSecs int
	client       *http.Client
}

func NewEngine(router *Router, creds *repository.CredentialRepository, cooldown *goredis.CooldownStore, encKey string, maxRetries, cooldownSecs int) *Engine {
	return &Engine{
		router:       router,
		creds:        creds,
		cooldown:     cooldown,
		encKey:       encKey,
		maxRetries:   maxRetries,
		cooldownSecs: cooldownSecs,
		client:       &http.Client{Timeout: 5 * time.Minute},
	}
}

type ProxyRequest struct {
	Model       string                   `json:"model"`
	Messages    []map[string]interface{} `json:"messages"`
	Stream      bool                     `json:"stream"`
	MaxTokens   int                      `json:"max_tokens,omitempty"`
	Temperature float64                  `json:"temperature,omitempty"`
	Extra       map[string]interface{}   `json:"-"`
}

func (e *Engine) Proxy(c *gin.Context, req *ProxyRequest, gatewayKey *models.GatewayAPIKey) (*ProviderResponse, *models.RequestLog, error) {
	start := time.Now()

	routes, err := e.router.ResolveWithFallback(c.Request.Context(), req.Model, gatewayKey, e.cooldown)
	if err != nil {
		return nil, nil, err
	}

	var lastErr error
	var retryCount int

	for i, route := range routes {
		if i > 0 {
			retryCount++
		}

		apiKey, err := e.creds.DecryptKey(c.Request.Context(), route.Credential.ID, e.encKey)
		if err != nil {
			lastErr = fmt.Errorf("decrypt credential: %w", err)
			continue
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
			lastErr = fmt.Errorf("build request: %w", err)
			continue
		}

		httpResp, err := e.client.Do(httpReq)
		if err != nil {
			lastErr = fmt.Errorf("execute request: %w", err)
			continue
		}

		body, err := io.ReadAll(httpResp.Body)
		httpResp.Body.Close()
		if err != nil {
			lastErr = fmt.Errorf("read response: %w", err)
			continue
		}

		// 429 → cooldown and retry
		if httpResp.StatusCode == http.StatusTooManyRequests {
			retryAfter := e.cooldownSecs
			if h := httpResp.Header.Get("Retry-After"); h != "" {
				if sec, err := strconv.Atoi(h); err == nil && sec > 0 {
					retryAfter = sec
				}
			}
			_ = e.cooldown.SetCooldown(c.Request.Context(), route.Credential.ID, retryAfter)
			lastErr = fmt.Errorf("rate limited (429) on credential %s", route.Credential.ID)
			continue
		}

		// 401/403 → mark invalid, retry
		if httpResp.StatusCode == http.StatusUnauthorized || httpResp.StatusCode == http.StatusForbidden {
			_ = e.creds.UpdateStatus(c.Request.Context(), route.Credential.ID, "invalid")
			lastErr = fmt.Errorf("credential %s returned %d", route.Credential.ID, httpResp.StatusCode)
			continue
		}

		// 5xx → retry
		if httpResp.StatusCode >= 500 {
			lastErr = fmt.Errorf("upstream returned %d", httpResp.StatusCode)
			continue
		}

		// Success
		_ = e.creds.IncrementUsage(c.Request.Context(), route.Credential.ID)

		resp, err := route.Adapter.ParseResponse(bytes.NewReader(body))
		if err != nil {
			lastErr = fmt.Errorf("parse response: %w", err)
			continue
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
			RetryCount:      retryCount,
		}

		if resp.Error != nil {
			log.ErrorMessage = sql.NullString{String: resp.Error.Message, Valid: true}
		}

		return resp, log, nil
	}

	return nil, nil, fmt.Errorf("all credentials exhausted after %d retries: %w", retryCount, lastErr)
}

func (e *Engine) ProxyStream(c *gin.Context, req *ProxyRequest, gatewayKey *models.GatewayAPIKey) (*models.RequestLog, error) {
	start := time.Now()

	routes, err := e.router.ResolveWithFallback(c.Request.Context(), req.Model, gatewayKey, e.cooldown)
	if err != nil {
		return nil, err
	}

	var lastErr error
	var retryCount int

	for i, route := range routes {
		if i > 0 {
			retryCount++
		}

		apiKey, err := e.creds.DecryptKey(c.Request.Context(), route.Credential.ID, e.encKey)
		if err != nil {
			lastErr = fmt.Errorf("decrypt credential: %w", err)
			continue
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
			lastErr = fmt.Errorf("build request: %w", err)
			continue
		}

		httpResp, err := e.client.Do(httpReq)
		if err != nil {
			lastErr = fmt.Errorf("execute request: %w", err)
			continue
		}

		// 429 → cooldown and retry (before streaming starts)
		if httpResp.StatusCode == http.StatusTooManyRequests {
			httpResp.Body.Close()
			retryAfter := e.cooldownSecs
			if h := httpResp.Header.Get("Retry-After"); h != "" {
				if sec, err := strconv.Atoi(h); err == nil && sec > 0 {
					retryAfter = sec
				}
			}
			_ = e.cooldown.SetCooldown(c.Request.Context(), route.Credential.ID, retryAfter)
			lastErr = fmt.Errorf("rate limited (429) on credential %s", route.Credential.ID)
			continue
		}

		// 401/403 → mark invalid, retry
		if httpResp.StatusCode == http.StatusUnauthorized || httpResp.StatusCode == http.StatusForbidden {
			httpResp.Body.Close()
			_ = e.creds.UpdateStatus(c.Request.Context(), route.Credential.ID, "invalid")
			lastErr = fmt.Errorf("credential %s returned %d", route.Credential.ID, httpResp.StatusCode)
			continue
		}

		// 5xx → retry
		if httpResp.StatusCode >= 500 {
			httpResp.Body.Close()
			lastErr = fmt.Errorf("upstream returned %d", httpResp.StatusCode)
			continue
		}

		// 4xx (other than 401/403/429) → abort immediately, do not retry
		if httpResp.StatusCode >= 400 && httpResp.StatusCode < 500 {
			bodyBytes, _ := io.ReadAll(httpResp.Body)
			httpResp.Body.Close()
			return nil, fmt.Errorf("upstream error %d: %s", httpResp.StatusCode, string(bodyBytes))
		}

		// Success → start streaming
		_ = e.creds.IncrementUsage(c.Request.Context(), route.Credential.ID)
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
		_, _ = c.Writer.Write([]byte("data: "))
		_, _ = c.Writer.Write(jsonChunk)
		_, _ = c.Writer.Write([]byte("\n\n"))
		c.Writer.Flush()
		}

		_, _ = c.Writer.Write([]byte("data: [DONE]\n\n"))
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
			RetryCount:      retryCount,
		}

		return log, nil
	}

	return nil, fmt.Errorf("all credentials exhausted after %d retries: %w", retryCount, lastErr)
}
