package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	goredis "github.com/roozylabs/prism/internal/redis"
	"github.com/roozylabs/prism/internal/repository"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/proxy"
)

type ResourceGatewayHandler struct {
	gateway   proxy.ResourceGatewayExecutor
	toolInv   *repository.ToolInvocationRepository
	eventPub  *goredis.EventPublisher
	encKey    string
}

func NewResourceGatewayHandler(gw proxy.ResourceGatewayExecutor, toolInv *repository.ToolInvocationRepository, eventPub *goredis.EventPublisher, encKey string) *ResourceGatewayHandler {
	return &ResourceGatewayHandler{gateway: gw, toolInv: toolInv, eventPub: eventPub, encKey: encKey}
}

type QueryResourceRequest struct {
	Args map[string]interface{} `json:"args" binding:"required"`
}

func (h *ResourceGatewayHandler) ExecuteQuery(c *gin.Context) {
	resourceName := c.Param("resourceName")
	gatewayKey, _ := c.MustGet("gatewayKey").(*models.GatewayAPIKey)
	if gatewayKey == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "gateway key required"})
		return
	}

	var req QueryResourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	executionID := uuid.New().String()
	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()

	result, err := h.gateway.Execute(ctx, gatewayKey.UserID, resourceName, req.Args, h.encKey)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": err.Error(),
				"type":    "resource_execution_error",
			},
		})
		return
	}

	argsJSON, _ := json.Marshal(req.Args)
	_ = h.toolInv.CreateBatch(c.Request.Context(), executionID, []models.ToolCallRecord{
		{Name: "resource:" + resourceName, Arguments: argsJSON},
	})

	_ = h.eventPub.Publish(c.Request.Context(), "RESOURCE_EXECUTED", map[string]interface{}{
		"executionId":  executionID,
		"resource":     resourceName,
		"backend":      result.Backend,
		"backendType":  result.BackendType,
		"statusCode":   result.StatusCode,
		"rowCount":     result.RowCount,
		"latencyMs":    result.LatencyMs,
	})

	c.JSON(http.StatusOK, result)
}
