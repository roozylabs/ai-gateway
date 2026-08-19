package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/roozylabs/ai-gateway/internal/models"
	"github.com/roozylabs/ai-gateway/internal/proxy"
	"github.com/roozylabs/ai-gateway/internal/repository"
	goredis "github.com/roozylabs/ai-gateway/internal/redis"
)

type GatewayHandler struct {
	engine        *proxy.Engine
	gatewayKeys   *repository.GatewayKeyRepository
	requestLogs   *repository.RequestLogRepository
	eventPublisher *goredis.EventPublisher
}

func NewGatewayHandler(
	engine *proxy.Engine,
	gatewayKeys *repository.GatewayKeyRepository,
	requestLogs *repository.RequestLogRepository,
	eventPublisher *goredis.EventPublisher,
) *GatewayHandler {
	return &GatewayHandler{
		engine:        engine,
		gatewayKeys:   gatewayKeys,
		requestLogs:   requestLogs,
		eventPublisher: eventPublisher,
	}
}

func (h *GatewayHandler) ChatCompletions(c *gin.Context) {
	gatewayKey := c.MustGet("gatewayKey").(*models.GatewayAPIKey)
	requestID := uuid.New().String()

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

	if req.Stream {
		log, err := h.engine.ProxyStream(c, &req, gatewayKey)
		if err != nil {
			h.handleProxyError(c, err, gatewayKey, &req)
			return
		}
		if log != nil {
			log.RequestID = requestID
			_ = h.requestLogs.Create(c.Request.Context(), log)
			_ = h.gatewayKeys.IncrementUsage(c.Request.Context(), gatewayKey.ID)
			h.publishEvents(c, requestID, log, gatewayKey)
		}
		c.Header("X-Request-ID", requestID)
		return
	}

	resp, log, err := h.engine.Proxy(c, &req, gatewayKey)
	if err != nil {
		h.handleProxyError(c, err, gatewayKey, &req)
		return
	}

	if log != nil {
		log.RequestID = requestID
		_ = h.requestLogs.Create(c.Request.Context(), log)
		_ = h.gatewayKeys.IncrementUsage(c.Request.Context(), gatewayKey.ID)
		h.publishEvents(c, requestID, log, gatewayKey)
	}

	c.Header("X-Request-ID", requestID)

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
	status := http.StatusInternalServerError
	errType := "api_error"

	switch {
	case errors.Is(err, proxy.ErrModelNotAllowed):
		status = http.StatusForbidden
		errType = "invalid_request_error"
	case errors.Is(err, proxy.ErrModelNotFound):
		status = http.StatusNotFound
		errType = "invalid_request_error"
	case errors.Is(err, proxy.ErrNoCredentials):
		status = http.StatusServiceUnavailable
		errType = "api_error"
	}

	c.JSON(status, gin.H{"error": gin.H{"message": err.Error(), "type": errType}})
}

func (h *GatewayHandler) Models(c *gin.Context) {
	models := []map[string]interface{}{
		{"id": "gpt-4o", "object": "model", "owned_by": "openai"},
		{"id": "gpt-4o-mini", "object": "model", "owned_by": "openai"},
		{"id": "claude-3-5-sonnet-20241022", "object": "model", "owned_by": "anthropic"},
		{"id": "claude-3-haiku-20240307", "object": "model", "owned_by": "anthropic"},
	}

	c.JSON(http.StatusOK, gin.H{
		"object": "list",
		"data":   models,
	})
}
