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
	"math/rand"
	"net"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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
	throttler    *ProviderThrottler
	concurrency  *ProviderConcurrencyLimiter
	encKey       string
	maxRetries   int
	cooldownSecs int
	client       *http.Client
}

func NewEngine(router *Router, creds *repository.CredentialRepository, cooldown *goredis.CooldownStore, publisher *goredis.EventPublisher, encKey string, maxRetries, cooldownSecs int) *Engine {
	proxyFunc := http.ProxyFromEnvironment
	if customProxy := os.Getenv("GLOBAL_PROXY_URL"); customProxy != "" {
		if proxyURL, err := url.Parse(customProxy); err == nil {
			proxyFunc = http.ProxyURL(proxyURL)
		}
	}

	tr := &http.Transport{
		Proxy: proxyFunc,
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
		throttler:    NewProviderThrottler(),
		concurrency:  NewProviderConcurrencyLimiter(),
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

	reqID := c.GetString("requestID")
	if reqID == "" {
		reqID = uuid.New().String()
	}

	routes, err := e.router.ResolveWithFallback(c.Request.Context(), req.Model, gatewayKey, e.cooldown)
	if err != nil {
		return nil, nil, err
	}

	activeCredName := ""
	if len(routes) > 0 {
		activeCredName = getCredentialDisplayName(routes[0].Credential)
	}

	_ = e.cooldown.TrackActiveStream(c.Request.Context(), reqID, req.Model, gwKeyID, activeCredName)
	if e.publisher != nil {
		if summary, err := e.cooldown.GetActiveStreams(c.Request.Context()); err == nil {
			_ = e.publisher.Publish(c.Request.Context(), "active_streams_update", summary)
		}
	}

	defer func() {
		bgCtx := context.Background()
		_ = e.cooldown.UntrackActiveStream(bgCtx, reqID)
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
			_ = e.cooldown.TrackActiveStream(c.Request.Context(), reqID, req.Model, gwKeyID, getCredentialDisplayName(route.Credential))
			if e.publisher != nil {
				if summary, err := e.cooldown.GetActiveStreams(c.Request.Context()); err == nil {
					_ = e.publisher.Publish(c.Request.Context(), "active_streams_update", summary)
				}
			}
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

		_ = e.throttler.Wait(c.Request.Context(), route.Provider.Type)
		release, err := e.concurrency.Acquire(c.Request.Context(), route.Provider.Type)
		if err != nil {
			lastErr = fmt.Errorf("concurrency limit wait: %w", err)
			continue
		}

		httpResp, err := e.client.Do(httpReq)
		if err != nil {
			release()
			lastErr = fmt.Errorf("execute request: %w", err)
			continue
		}

		body, err := io.ReadAll(httpResp.Body)
		httpResp.Body.Close()
		release()
		if err != nil {
			lastErr = fmt.Errorf("read response: %w", err)
			continue
		}

		// 429 → cooldown and retry
		if httpResp.StatusCode == http.StatusTooManyRequests {
			bodyStr := string(body)
			retryAfter := determineCooldownDuration(httpResp.Header, bodyStr)
			e.extractAndSaveQuota(c.Request.Context(), route.Credential.ID, httpResp.Header, true, retryAfter, bodyStr)
			_ = e.cooldown.SetCooldown(c.Request.Context(), route.Credential.ID, retryAfter)
			if e.publisher != nil {
				_ = e.publisher.Publish(c.Request.Context(), "CREDENTIAL_COOLDOWN_STARTED", map[string]interface{}{
					"credentialId": route.Credential.ID,
					"retryAfter":   retryAfter,
					"model":        req.Model,
				})
			}
			lastErr = fmt.Errorf("upstream rate limit (429) on credential %s (retry after %ds): %s", route.Credential.ID, retryAfter, strings.TrimSpace(bodyStr))
			time.Sleep(calculateBackoff(i, retryAfter))
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
		_ = e.creds.UpdateStatus(c.Request.Context(), route.Credential.ID, "active")
		e.extractAndSaveQuota(c.Request.Context(), route.Credential.ID, httpResp.Header, false, 0, "")

		resp, err := route.Adapter.ParseResponse(bytes.NewReader(body))
		if err != nil {
			lastErr = fmt.Errorf("parse response: %w", err)
			continue
		}

		if resp.Usage.TotalTokens == 0 {
			inputChars := 0
			for _, m := range req.Messages {
				if content, ok := m["content"].(string); ok {
					inputChars += len(content)
				}
			}
			outputChars := 0
			for _, choice := range resp.Choices {
				if content, ok := choice.Message["content"].(string); ok {
					outputChars += len(content)
				}
			}
			estInput := (inputChars + 3) / 4
			estOutput := (outputChars + 3) / 4
			if estInput < 1 {
				estInput = 1
			}
			if estOutput < 1 && outputChars > 0 {
				estOutput = 1
			}
			resp.Usage = Usage{
				PromptTokens:     estInput,
				CompletionTokens: estOutput,
				TotalTokens:      estInput + estOutput,
			}
		}

		latency := int(time.Since(start).Milliseconds())

		log := &models.RequestLog{
			GatewayAPIKeyID: &gatewayKey.ID,
			ProviderID:      &route.Provider.ID,
			ProviderType:    route.Provider.Type,
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
	var ttftMs int
	var ttftCaptured bool

	gwKeyID := ""
	if gatewayKey != nil {
		gwKeyID = gatewayKey.ID
	}

	reqID := c.GetString("requestID")
	if reqID == "" {
		reqID = uuid.New().String()
	}

	routes, err := e.router.ResolveWithFallback(c.Request.Context(), req.Model, gatewayKey, e.cooldown)
	if err != nil {
		return nil, err
	}

	activeCredName := ""
	if len(routes) > 0 {
		activeCredName = getCredentialDisplayName(routes[0].Credential)
	}

	_ = e.cooldown.TrackActiveStream(c.Request.Context(), reqID, req.Model, gwKeyID, activeCredName)
	if e.publisher != nil {
		if summary, err := e.cooldown.GetActiveStreams(c.Request.Context()); err == nil {
			_ = e.publisher.Publish(c.Request.Context(), "active_streams_update", summary)
		}
	}

	defer func() {
		bgCtx := context.Background()
		_ = e.cooldown.UntrackActiveStream(bgCtx, reqID)
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
			_ = e.cooldown.TrackActiveStream(c.Request.Context(), reqID, req.Model, gwKeyID, getCredentialDisplayName(route.Credential))
			if e.publisher != nil {
				if summary, err := e.cooldown.GetActiveStreams(c.Request.Context()); err == nil {
					_ = e.publisher.Publish(c.Request.Context(), "active_streams_update", summary)
				}
			}
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

		_ = e.throttler.Wait(c.Request.Context(), route.Provider.Type)
		release, err := e.concurrency.Acquire(c.Request.Context(), route.Provider.Type)
		if err != nil {
			lastErr = fmt.Errorf("concurrency limit wait: %w", err)
			continue
		}

		httpResp, err := e.client.Do(httpReq)
		if err != nil {
			release()
			lastErr = fmt.Errorf("execute request: %w", err)
			continue
		}

		// 429 → cooldown and retry (before streaming starts)
		if httpResp.StatusCode == http.StatusTooManyRequests {
			bodyBytes, _ := io.ReadAll(httpResp.Body)
			httpResp.Body.Close()
			release()
			bodyStr := string(bodyBytes)

			retryAfter := determineCooldownDuration(httpResp.Header, bodyStr)
			e.extractAndSaveQuota(c.Request.Context(), route.Credential.ID, httpResp.Header, true, retryAfter, bodyStr)
			_ = e.cooldown.SetCooldown(c.Request.Context(), route.Credential.ID, retryAfter)
			if e.publisher != nil {
				_ = e.publisher.Publish(c.Request.Context(), "CREDENTIAL_COOLDOWN_STARTED", map[string]interface{}{
					"credentialId": route.Credential.ID,
					"retryAfter":   retryAfter,
					"model":        req.Model,
				})
			}
			lastErr = fmt.Errorf("upstream rate limit (429) on credential %s (retry after %ds): %s", route.Credential.ID, retryAfter, strings.TrimSpace(bodyStr))
			time.Sleep(calculateBackoff(i, retryAfter))
			continue
		}

		// 401/403 → mark invalid, retry
		if httpResp.StatusCode == http.StatusUnauthorized || httpResp.StatusCode == http.StatusForbidden {
			httpResp.Body.Close()
			release()
			_ = e.creds.UpdateStatus(c.Request.Context(), route.Credential.ID, "invalid")
			lastErr = fmt.Errorf("credential %s returned %d", route.Credential.ID, httpResp.StatusCode)
			continue
		}

		// 5xx → retry
		if httpResp.StatusCode >= 500 {
			httpResp.Body.Close()
			release()
			lastErr = fmt.Errorf("upstream returned %d", httpResp.StatusCode)
			continue
		}

		// 4xx (other than 401/403/429) → abort immediately, do not retry
		if httpResp.StatusCode >= 400 && httpResp.StatusCode < 500 {
			bodyBytes, _ := io.ReadAll(httpResp.Body)
			httpResp.Body.Close()
			release()
			return nil, fmt.Errorf("upstream error %d: %s", httpResp.StatusCode, string(bodyBytes))
		}

		// Success → start streaming
		_ = e.creds.IncrementUsage(c.Request.Context(), route.Credential.ID)
		_ = e.creds.UpdateStatus(c.Request.Context(), route.Credential.ID, "active")
		e.extractAndSaveQuota(c.Request.Context(), route.Credential.ID, httpResp.Header, false, 0, "")
		defer func() {
			httpResp.Body.Close()
			release()
		}()

		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Status(http.StatusOK)

		var totalTokens Usage
		var outputCharCount int
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

			// Capture TTFT on first non-empty content or reasoning token
			if !ttftCaptured && chunk.Choices != nil {
				for _, ch := range chunk.Choices {
					if ch.Delta != nil {
						if content, ok := ch.Delta["content"].(string); ok && content != "" {
							ttftMs = int(time.Since(start).Milliseconds())
							ttftCaptured = true
							break
						}
						if _, ok := ch.Delta["reasoning_content"].(string); ok {
							ttftMs = int(time.Since(start).Milliseconds())
							ttftCaptured = true
							break
						}
					}
				}
			}

			if chunk.Usage.TotalTokens > 0 {
				totalTokens = chunk.Usage
			}

			for _, ch := range chunk.Choices {
				if ch.Delta != nil {
					if content, ok := ch.Delta["content"].(string); ok {
						outputCharCount += len(content)
					}
				}
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

		if totalTokens.TotalTokens == 0 {
			inputChars := 0
			for _, m := range req.Messages {
				if content, ok := m["content"].(string); ok {
					inputChars += len(content)
				}
			}
			estInput := (inputChars + 3) / 4
			estOutput := (outputCharCount + 3) / 4
			if estInput < 1 {
				estInput = 1
			}
			if estOutput < 1 && outputCharCount > 0 {
				estOutput = 1
			}
			totalTokens = Usage{
				PromptTokens:     estInput,
				CompletionTokens: estOutput,
				TotalTokens:      estInput + estOutput,
			}
		}

		latency := int(time.Since(start).Milliseconds())

		log := &models.RequestLog{
			GatewayAPIKeyID: &gatewayKey.ID,
			ProviderID:      &route.Provider.ID,
			ProviderType:    route.Provider.Type,
			CredentialID:    &route.Credential.ID,
			Model:           req.Model,
			StatusCode:      httpResp.StatusCode,
			LatencyMs:       latency,
			InputTokens:     totalTokens.PromptTokens,
			OutputTokens:    totalTokens.CompletionTokens,
			TotalTokens:     totalTokens.TotalTokens,
			RetryCount:      retryCount,
			TTFTMs:          ttftMs,
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

func (e *Engine) extractAndSaveQuota(ctx context.Context, credID string, headers http.Header, is429 bool, retryAfterSec int, bodyStr string) {
	if credID == "" || e.cooldown == nil {
		return
	}

	quota := &goredis.CredentialQuotaInfo{
		ResetDurationSec: retryAfterSec,
	}

	hasData := false

	// OpenAI Headers
	if rem := headers.Get("x-ratelimit-remaining-requests"); rem != "" {
		if v, err := strconv.ParseInt(rem, 10, 64); err == nil {
			quota.RemainingRequests = v
			hasData = true
		}
	}
	if lim := headers.Get("x-ratelimit-limit-requests"); lim != "" {
		if v, err := strconv.ParseInt(lim, 10, 64); err == nil {
			quota.LimitRequests = v
			hasData = true
		}
	}
	if rem := headers.Get("x-ratelimit-remaining-tokens"); rem != "" {
		if v, err := strconv.ParseInt(rem, 10, 64); err == nil {
			quota.RemainingTokens = v
			hasData = true
		}
	}
	if lim := headers.Get("x-ratelimit-limit-tokens"); lim != "" {
		if v, err := strconv.ParseInt(lim, 10, 64); err == nil {
			quota.LimitTokens = v
			hasData = true
		}
	}
	if reset := headers.Get("x-ratelimit-reset-requests"); reset != "" {
		quota.ResetAt = reset
		hasData = true
	} else if reset := headers.Get("x-ratelimit-reset-tokens"); reset != "" {
		quota.ResetAt = reset
		hasData = true
	}

	// Anthropic Headers
	if rem := headers.Get("anthropic-ratelimit-requests-remaining"); rem != "" {
		if v, err := strconv.ParseInt(rem, 10, 64); err == nil {
			quota.RemainingRequests = v
			hasData = true
		}
	}
	if lim := headers.Get("anthropic-ratelimit-requests-limit"); lim != "" {
		if v, err := strconv.ParseInt(lim, 10, 64); err == nil {
			quota.LimitRequests = v
			hasData = true
		}
	}
	if rem := headers.Get("anthropic-ratelimit-tokens-remaining"); rem != "" {
		if v, err := strconv.ParseInt(rem, 10, 64); err == nil {
			quota.RemainingTokens = v
			hasData = true
		}
	}
	if lim := headers.Get("anthropic-ratelimit-tokens-limit"); lim != "" {
		if v, err := strconv.ParseInt(lim, 10, 64); err == nil {
			quota.LimitTokens = v
			hasData = true
		}
	}
	if reset := headers.Get("anthropic-ratelimit-requests-reset"); reset != "" {
		quota.ResetAt = reset
		hasData = true
	}

	if is429 {
		hasData = true
		lower := strings.ToLower(bodyStr)
		if strings.Contains(bodyStr, "FreeUsageLimitError") || strings.Contains(lower, "insufficient_quota") || strings.Contains(lower, "daily limit") || strings.Contains(lower, "monthly limit") {
			quota.StatusText = "Daily Quota Exceeded"
		} else {
			quota.StatusText = "Rate Limited"
		}
	}

	if hasData {
		_ = e.cooldown.SaveCredentialQuota(ctx, credID, quota)
		if e.publisher != nil {
			_ = e.publisher.Publish(ctx, "CREDENTIAL_QUOTA_UPDATED", map[string]interface{}{
				"credentialId": credID,
				"quota":        quota,
			})
		}
	} else if !is429 {
		// On successful 200 OK request with no rate limit headers, clear stale error quota!
		_ = e.cooldown.DeleteCredentialQuota(ctx, credID)
		if e.publisher != nil {
			_ = e.publisher.Publish(ctx, "CREDENTIAL_QUOTA_UPDATED", map[string]interface{}{
				"credentialId": credID,
				"quota":        nil,
			})
		}
	}
}

var retryInRegex = regexp.MustCompile(`(?i)(?:retry|try again|wait|in)\s+(\d+)\s*(?:s|sec|seconds?)`)

func determineCooldownDuration(header http.Header, bodyStr string) int {
	// 1. Check upstream Retry-After header (seconds)
	if h := header.Get("Retry-After"); h != "" {
		if sec, err := strconv.Atoi(h); err == nil && sec > 0 {
			return sec
		}
	}

	// 2. Check for Anthropic reset header (ISO timestamp)
	if reset := header.Get("anthropic-ratelimit-requests-reset"); reset != "" {
		if t, err := time.Parse(time.RFC3339, reset); err == nil {
			diff := int(time.Until(t).Seconds())
			if diff > 0 {
				return diff
			}
		}
	}

	// 3. Check for OpenAI reset duration header (e.g. "6s" or "500ms" or "1m0s")
	if reset := header.Get("x-ratelimit-reset-requests"); reset != "" {
		if d, err := time.ParseDuration(reset); err == nil && d > 0 {
			return int(d.Seconds()) + 1
		}
	}
	if reset := header.Get("x-ratelimit-reset-tokens"); reset != "" {
		if d, err := time.ParseDuration(reset); err == nil && d > 0 {
			return int(d.Seconds()) + 1
		}
	}

	// 4. Try to parse from error message (e.g. "Rate limit reached. Please try again in 5s")
	if matches := retryInRegex.FindStringSubmatch(bodyStr); len(matches) > 1 {
		if sec, err := strconv.Atoi(matches[1]); err == nil && sec > 0 {
			return sec
		}
	}

	// 5. If upstream did not provide a specific duration, use a minimal 5-second backoff
	// so the current request can immediately try the next key in the pool,
	// without locking out this key for minutes or days.
	return 5
}

func calculateBackoff(attempt int, retryAfter int) time.Duration {
	if retryAfter > 0 && retryAfter <= 30 {
		jitter := time.Duration(rand.Intn(300)) * time.Millisecond
		return time.Duration(retryAfter)*time.Second + jitter
	}
	baseMs := 500 * (1 << attempt)
	if baseMs > 4000 {
		baseMs = 4000
	}
	jitter := rand.Intn(300)
	return time.Duration(baseMs+jitter) * time.Millisecond
}
