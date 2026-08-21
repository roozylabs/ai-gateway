package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/roozylabs/ai-gateway/internal/models"
	"github.com/roozylabs/ai-gateway/internal/proxy"
	goredis "github.com/roozylabs/ai-gateway/internal/redis"
	"github.com/roozylabs/ai-gateway/internal/repository"
	"github.com/roozylabs/ai-gateway/internal/utils"
)

type GatewayHandler struct {
	engine        *proxy.Engine
	gatewayKeys   *repository.GatewayKeyRepository
	requestLogs   *repository.RequestLogRepository
	eventPublisher *goredis.EventPublisher
	pricingRepo   *repository.ModelPricingRepository
}

func NewGatewayHandler(
	engine *proxy.Engine,
	gatewayKeys *repository.GatewayKeyRepository,
	requestLogs *repository.RequestLogRepository,
	eventPublisher *goredis.EventPublisher,
	pricingRepo *repository.ModelPricingRepository,
) *GatewayHandler {
	return &GatewayHandler{
		engine:        engine,
		gatewayKeys:   gatewayKeys,
		requestLogs:   requestLogs,
		eventPublisher: eventPublisher,
		pricingRepo:   pricingRepo,
	}
}

func (h *GatewayHandler) ChatCompletions(c *gin.Context) {
	gatewayKey := c.MustGet("gatewayKey").(*models.GatewayAPIKey)
	requestID := uuid.New().String()
	c.Set("requestID", requestID)

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "Failed to read request body", "type": "invalid_request_error"}})
		return
	}

	var req proxy.ProxyRequest
	if err := json.Unmarshal(body, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "Invalid JSON", "type": "invalid_request_error"}})
		return
	}

	if req.Model == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "Model is required", "type": "invalid_request_error"}})
		return
	}

	clientIP := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	clientApp := parseClientApp(userAgent)

	if req.Stream {
		log, err := h.engine.ProxyStream(c, &req, gatewayKey)
		if err != nil {
			h.handleProxyError(c, err, gatewayKey, &req)
			return
		}
		if log != nil {
			log.RequestID = requestID
			log.ClientIP = clientIP
			log.UserAgent = userAgent
			log.ClientApp = clientApp
			log.IsStream = true
			if log.CostUSD == 0 && h.pricingRepo != nil {
				log.CostUSD = h.pricingRepo.CalculateCost(log.Model, log.ProviderType, log.InputTokens, log.OutputTokens)
			}
			_ = h.requestLogs.Create(c.Request.Context(), log)
			_ = h.gatewayKeys.IncrementUsage(c.Request.Context(), gatewayKey.ID)
			h.publishEvents(c, requestID, log, gatewayKey)

			c.Header("X-Request-ID", requestID)
			c.Header("X-Roozy-Model", log.Model)
			c.Header("X-Roozy-Provider", log.ProviderType)
		}
		return
	}

	resp, log, err := h.engine.Proxy(c, &req, gatewayKey)
	if err != nil {
		h.handleProxyError(c, err, gatewayKey, &req)
		return
	}

	if log != nil {
		log.RequestID = requestID
		log.ClientIP = clientIP
		log.UserAgent = userAgent
		log.ClientApp = clientApp
		log.IsStream = false
		if log.CostUSD == 0 && h.pricingRepo != nil {
			log.CostUSD = h.pricingRepo.CalculateCost(log.Model, log.ProviderType, log.InputTokens, log.OutputTokens)
		}
		_ = h.requestLogs.Create(c.Request.Context(), log)
		_ = h.gatewayKeys.IncrementUsage(c.Request.Context(), gatewayKey.ID)
		h.publishEvents(c, requestID, log, gatewayKey)

		c.Header("X-Request-ID", requestID)
		c.Header("X-Roozy-Model", log.Model)
		c.Header("X-Roozy-Provider", log.ProviderType)
	}

	if resp.Error != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": resp.Error.Message,
				"type":    resp.Error.Type,
				"code":    resp.Error.Code,
			},
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *GatewayHandler) publishEvents(c *gin.Context, requestID string, log *models.RequestLog, key *models.GatewayAPIKey) {
	_ = h.eventPublisher.Publish(c.Request.Context(), "REQUEST_COMPLETED", map[string]interface{}{
		"requestId":  requestID,
		"model":      log.Model,
		"statusCode": log.StatusCode,
		"latencyMs":  log.LatencyMs,
		"tokens":     log.TotalTokens,
	})

	_ = h.eventPublisher.Publish(c.Request.Context(), "NEW_REQUEST_LOG", map[string]interface{}{
		"requestId":  requestID,
		"model":      log.Model,
		"statusCode": log.StatusCode,
		"latencyMs":  log.LatencyMs,
		"createdAt":  log.CreatedAt,
	})

	_ = h.eventPublisher.Publish(c.Request.Context(), "KEY_USED", map[string]interface{}{
		"gatewayKeyId": key.ID,
		"requestCount": key.RequestCount,
	})
}

func (h *GatewayHandler) handleProxyError(c *gin.Context, err error, key *models.GatewayAPIKey, req *proxy.ProxyRequest) {
	status, errType, errCode, cleanMsg := utils.CleanUpstreamError(err)
	c.JSON(status, gin.H{
		"error": gin.H{
			"message": cleanMsg,
			"type":    errType,
			"code":    errCode,
			"param":   nil,
		},
	})
}

func (h *GatewayHandler) SandboxChatCompletions(c *gin.Context) {
	keyPrefix := c.GetHeader("X-Sandbox-Key-Prefix")
	if keyPrefix == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "Missing X-Sandbox-Key-Prefix header", "type": "invalid_request_error"}})
		return
	}

	gatewayKey, err := h.gatewayKeys.FindByKeyPrefix(c.Request.Context(), keyPrefix)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "Invalid API key prefix", "type": "invalid_request_error"}})
		return
	}

	c.Set("gatewayKey", gatewayKey)
	h.ChatCompletions(c)
}

func (h *GatewayHandler) Models(c *gin.Context) {
	modelsList := []map[string]interface{}{
		{"id": models.SmartRouterModel, "object": "model", "owned_by": "roozylabs"},
		{"id": "gpt-4o", "object": "model", "owned_by": "openai"},
		{"id": "gpt-4o-mini", "object": "model", "owned_by": "openai"},
		{"id": "claude-3-5-sonnet-20241022", "object": "model", "owned_by": "anthropic"},
		{"id": "claude-3-haiku-20240307", "object": "model", "owned_by": "anthropic"},
		{"id": "gemini-1.5-pro", "object": "model", "owned_by": "google"},
		{"id": "gemini-1.5-flash", "object": "model", "owned_by": "google"},
		{"id": "big-pickle", "object": "model", "owned_by": "opencode"},
	}

	c.JSON(http.StatusOK, gin.H{
		"object": "list",
		"data":   modelsList,
	})
}

func parseClientApp(ua string) string {
	if ua == "" {
		return "API Client"
	}
	uaLower := strings.ToLower(ua)
	if strings.Contains(uaLower, "opencode") {
		return "OpenCode"
	}
	if strings.Contains(uaLower, "antigravity") || strings.Contains(uaLower, "agy") {
		return "Antigravity"
	}
	if strings.Contains(uaLower, "claude-code") || strings.Contains(uaLower, "claudecode") {
		return "Claude Code"
	}
	if strings.Contains(uaLower, "python") {
		return "Python SDK"
	}
	if strings.Contains(uaLower, "node") || strings.Contains(uaLower, "axios") {
		return "Node.js SDK"
	}
	if strings.Contains(uaLower, "mozilla") || strings.Contains(uaLower, "chrome") || strings.Contains(uaLower, "safari") {
		return "Web Sandbox"
	}
	return "Custom App"
}
