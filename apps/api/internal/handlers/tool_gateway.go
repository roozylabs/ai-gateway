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

type ToolGatewayHandler struct {
	gateway  *proxy.ToolGateway
	toolInv  *repository.ToolInvocationRepository
	eventPub *goredis.EventPublisher
	encKey   string
}

func NewToolGatewayHandler(gw *proxy.ToolGateway, toolInv *repository.ToolInvocationRepository, eventPub *goredis.EventPublisher, encKey string) *ToolGatewayHandler {
	return &ToolGatewayHandler{gateway: gw, toolInv: toolInv, eventPub: eventPub, encKey: encKey}
}

type ExecuteToolRequest struct {
	Args map[string]interface{} `json:"args" binding:"required"`
}

func (h *ToolGatewayHandler) ExecuteTool(c *gin.Context) {
	toolName := c.Param("toolName")
	gatewayKey, _ := c.MustGet("gatewayKey").(*models.GatewayAPIKey)
	if gatewayKey == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "gateway key required"})
		return
	}

	if agentVal, exists := c.Get("agentObject"); exists && agentVal != nil {
		if agent, ok := agentVal.(*models.Agent); ok && len(agent.AllowedTools) > 0 {
			allowed := false
			for _, t := range agent.AllowedTools {
				if t == "*" || t == toolName {
					allowed = true
					break
				}
			}
			if !allowed {
				c.JSON(http.StatusForbidden, gin.H{
					"error": gin.H{
						"message": "Agent is not authorized to execute tool '" + toolName + "'",
						"type":    "permission_denied",
					},
				})
				return
			}
		}
	}

	var req ExecuteToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	executionID := uuid.New().String()
	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()

	result, err := h.gateway.Execute(ctx, gatewayKey.UserID, toolName, req.Args, h.encKey)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": err.Error(),
				"type":    "tool_execution_error",
			},
		})
		return
	}

	argsJSON, _ := json.Marshal(req.Args)
	_ = h.toolInv.CreateBatch(c.Request.Context(), executionID, []models.ToolCallRecord{
		{Name: toolName, Arguments: argsJSON},
	})

	_ = h.eventPub.Publish(c.Request.Context(), "TOOL_EXECUTED", map[string]interface{}{
		"executionId": executionID,
		"tool":        toolName,
		"backend":     result.Backend,
		"statusCode":  result.StatusCode,
		"latencyMs":   result.LatencyMs,
	})

	c.JSON(http.StatusOK, result)
}
