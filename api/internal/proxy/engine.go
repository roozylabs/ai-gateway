package proxy

import (
	"bufio"
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/models"
	goredis "github.com/roozylabs/ai-gateway/internal/redis"
	"github.com/roozylabs/ai-gateway/internal/repository"
	"github.com/roozylabs/ai-gateway/internal/utils"
)

type Engine struct {
	router       *Router
	creds        *repository.CredentialRepository
	cooldown     *goredis.CooldownStore
	publisher    *goredis.EventPublisher
	oauthMgr     *OAuthTokenManager
	encKey       string
	maxRetries   int
	cooldownSecs int
	client       *http.Client
}

func NewEngine(router *Router, creds *repository.CredentialRepository, cooldown *goredis.CooldownStore, publisher *goredis.EventPublisher, encKey string, maxRetries, cooldownSecs int) *Engine {
	tr := &http.Transport{
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: 30 * time.Second,
		MaxIdleConns:          100,
		IdleConnTimeout:       90 * time.Second,
	}
	return &Engine{
		router:       router,
		creds:        creds,
		cooldown:     cooldown,
		publisher:    publisher,
		oauthMgr:     NewOAuthTokenManager(cooldown),
		encKey:       encKey,
		maxRetries:   maxRetries,
		cooldownSecs: cooldownSecs,
		client:       &http.Client{Transport: tr, Timeout: 5 * time.Minute},
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

func (r *ProxyRequest) UnmarshalJSON(data []byte) error {
	type Alias ProxyRequest
	aux := &struct {
		*Alias
	}{
		Alias: (*Alias)(r),
	}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	var rawMap map[string]interface{}
	if err := json.Unmarshal(data, &rawMap); err != nil {
		return err
	}

	r.Extra = make(map[string]interface{})
	for k, v := range rawMap {
		switch k {
		case "model", "messages", "stream", "max_tokens", "temperature":
			// Known struct fields
		default:
			r.Extra[k] = v
		}
	}
	return nil
}

func (e *Engine) Proxy(c *gin.Context, req *ProxyRequest, gatewayKey *models.GatewayAPIKey) (*ProviderResponse, *models.RequestLog, error) {
	start := time.Now()

	gwKeyID := ""
	if gatewayKey != nil {
		gwKeyID = gatewayKey.ID
	}

	routes, err := e.router.ResolveWithFallback(c.Request.Context(), req.Model, gatewayKey, e.cooldown)
	if err != nil {
		return nil, nil, err
	}

	activeCredName := ""
	if len(routes) > 0 {
		activeCredName = getCredentialDisplayName(routes[0].Credential)
	}

	_ = e.cooldown.IncrementActiveStream(c.Request.Context(), req.Model, gwKeyID, activeCredName)
	if e.publisher != nil {
		if summary, err := e.cooldown.GetActiveStreams(c.Request.Context()); err == nil {
			_ = e.publisher.Publish(c.Request.Context(), "active_streams_update", summary)
		}
	}

	defer func() {
		bgCtx := context.Background()
		_ = e.cooldown.DecrementActiveStream(bgCtx, req.Model, gwKeyID, activeCredName)
		if e.publisher != nil {
			if summary, err := e.cooldown.GetActiveStreams(bgCtx); err == nil {
				_ = e.publisher.Publish(bgCtx, "active_streams_update", summary)
			}
		}
	}()

	var lastErr error
	var retryCount int

	for i, route := range routes {
		if i > 0 {
			retryCount++
		}

		var apiKey string
		if route.Credential.AuthType == "gcp_user_oauth" {
			meta, err := e.creds.DecryptMetadata(c.Request.Context(), route.Credential.ID, e.encKey)
			if err != nil {
				lastErr = fmt.Errorf("decrypt metadata: %w", err)
				continue
			}
			accessToken, err := e.oauthMgr.GetAccessToken(c.Request.Context(), route.Credential.ID, meta)
			if err != nil {
				lastErr = fmt.Errorf("fetch oauth access token: %w", err)
				continue
			}
			apiKey = accessToken
		} else {
			var err error
			apiKey, err = e.creds.DecryptKey(c.Request.Context(), route.Credential.ID, e.encKey)
			if err != nil {
				lastErr = fmt.Errorf("decrypt credential: %w", err)
				continue
			}
		}

		targetModel := req.Model
		if route.Model != nil && route.Model.Name != "" {
			targetModel = route.Model.Name
		}

		providerReq := &ProviderRequest{
			Model:       targetModel,
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
			bodyStr := string(body)
			retryAfter := e.cooldownSecs
			if h := httpResp.Header.Get("Retry-After"); h != "" {
				if sec, err := strconv.Atoi(h); err == nil && sec > 0 {
					retryAfter = sec
				}
			} else if strings.Contains(bodyStr, "FreeUsageLimitError") || strings.Contains(bodyStr, "quota") || strings.Contains(bodyStr, "Quota") || strings.Contains(bodyStr, "exceeded") {
				retryAfter = 86400 // 24 Hours for daily quota limits
			} else {
				retryAfter = 300 // 5 Minutes default
			}
			_ = e.cooldown.SetCooldown(c.Request.Context(), route.Credential.ID, retryAfter)
			_ = e.creds.UpdateStatus(c.Request.Context(), route.Credential.ID, "rate_limited")
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

	gwKeyID := ""
	if gatewayKey != nil {
		gwKeyID = gatewayKey.ID
	}

	routes, err := e.router.ResolveWithFallback(c.Request.Context(), req.Model, gatewayKey, e.cooldown)
	if err != nil {
		return nil, err
	}

	activeCredName := ""
	if len(routes) > 0 {
		activeCredName = getCredentialDisplayName(routes[0].Credential)
	}

	_ = e.cooldown.IncrementActiveStream(c.Request.Context(), req.Model, gwKeyID, activeCredName)
	if e.publisher != nil {
		if summary, err := e.cooldown.GetActiveStreams(c.Request.Context()); err == nil {
			_ = e.publisher.Publish(c.Request.Context(), "active_streams_update", summary)
		}
	}

	defer func() {
		bgCtx := context.Background()
		_ = e.cooldown.DecrementActiveStream(bgCtx, req.Model, gwKeyID, activeCredName)
		if e.publisher != nil {
			if summary, err := e.cooldown.GetActiveStreams(bgCtx); err == nil {
				_ = e.publisher.Publish(bgCtx, "active_streams_update", summary)
			}
		}
	}()

	var lastErr error
	var retryCount int

	for i, route := range routes {
		if i > 0 {
			retryCount++
		}

		var apiKey string
		if route.Credential.AuthType == "gcp_user_oauth" {
			meta, err := e.creds.DecryptMetadata(c.Request.Context(), route.Credential.ID, e.encKey)
			if err != nil {
				lastErr = fmt.Errorf("decrypt metadata: %w", err)
				continue
			}
			accessToken, err := e.oauthMgr.GetAccessToken(c.Request.Context(), route.Credential.ID, meta)
			if err != nil {
				lastErr = fmt.Errorf("fetch oauth access token: %w", err)
				continue
			}
			apiKey = accessToken
		} else {
			var err error
			apiKey, err = e.creds.DecryptKey(c.Request.Context(), route.Credential.ID, e.encKey)
			if err != nil {
				lastErr = fmt.Errorf("decrypt credential: %w", err)
				continue
			}
		}

		targetModel := req.Model
		if route.Model != nil && route.Model.Name != "" {
			targetModel = route.Model.Name
		}

		providerReq := &ProviderRequest{
			Model:       targetModel,
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
			bodyBytes, _ := io.ReadAll(httpResp.Body)
			httpResp.Body.Close()
			bodyStr := string(bodyBytes)

			retryAfter := e.cooldownSecs
			if h := httpResp.Header.Get("Retry-After"); h != "" {
				if sec, err := strconv.Atoi(h); err == nil && sec > 0 {
					retryAfter = sec
				}
			} else if strings.Contains(bodyStr, "FreeUsageLimitError") || strings.Contains(bodyStr, "quota") || strings.Contains(bodyStr, "Quota") || strings.Contains(bodyStr, "exceeded") {
				retryAfter = 86400 // 24 Hours for daily quota limits
			} else {
				retryAfter = 300 // 5 Minutes default
			}
			_ = e.cooldown.SetCooldown(c.Request.Context(), route.Credential.ID, retryAfter)
			_ = e.creds.UpdateStatus(c.Request.Context(), route.Credential.ID, "rate_limited")
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
		scanner.Buffer(make([]byte, 0, 64*1024), 10*1024*1024)

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

			if chunk.Choices == nil {
				chunk.Choices = []Choice{}
			} else {
				for i := range chunk.Choices {
					if chunk.Choices[i].Delta != nil {
						for k, v := range chunk.Choices[i].Delta {
							if v == nil {
								delete(chunk.Choices[i].Delta, k)
							}
						}
					}
				}
			}

			jsonChunk, _ := json.Marshal(chunk)
			_, _ = c.Writer.Write([]byte("data: "))
			_, _ = c.Writer.Write(jsonChunk)
			_, _ = c.Writer.Write([]byte("\n\n"))
			c.Writer.Flush()
		}

		if err := scanner.Err(); err != nil {
			log.Printf("stream scan error: %v", err)
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

func getCredentialDisplayName(c *models.Credential) string {
	if c == nil {
		return "unknown-cred"
	}
	if c.Name != "" {
		return utils.MaskEmailName(c.Name)
	}
	if c.MaskedKey != "" {
		return c.MaskedKey
	}
	if c.KeyPrefix != "" {
		return c.KeyPrefix + "••••"
	}
	if len(c.ID) >= 8 {
		return "cred-" + c.ID[:8]
	}
	return "active-cred"
}
