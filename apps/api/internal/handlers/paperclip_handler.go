package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/proxy"
)

type PaperclipHandler struct {
	adapter        *proxy.PaperclipAdapter
	gatewayHandler *GatewayHandler
}

func NewPaperclipHandler(adapter *proxy.PaperclipAdapter, gatewayHandler *GatewayHandler) *PaperclipHandler {
	return &PaperclipHandler{
		adapter:        adapter,
		gatewayHandler: gatewayHandler,
	}
}

type RegisterPaperclipAgentRequest struct {
	AgentID       string   `json:"agentId" binding:"required"`
	Name          string   `json:"name" binding:"required"`
	Description   string   `json:"description"`
	AllowedModels []string `json:"allowedModels"`
	AllowedTools  []string `json:"allowedTools"`
}

func (h *PaperclipHandler) RegisterAgent(c *gin.Context) {
	gatewayKey, _ := c.MustGet("gatewayKey").(*models.GatewayAPIKey)
	if gatewayKey == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "gateway key required"})
		return
	}

	var req RegisterPaperclipAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"message": "Invalid request body: " + err.Error(), "type": "invalid_request_error"},
		})
		return
	}

	agent, err := h.adapter.RegisterPaperclipAgent(
		c.Request.Context(),
		gatewayKey.UserID,
		req.AgentID,
		req.Name,
		req.Description,
		req.AllowedModels,
		req.AllowedTools,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "Failed to register Paperclip agent: " + err.Error(), "type": "internal_error"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Paperclip agent registered successfully",
		"agent":   agent,
	})
}

func (h *PaperclipHandler) ChatCompletions(c *gin.Context) {
	paperclipCtx := proxy.ExtractPaperclipContext(c)
	if paperclipCtx != nil && paperclipCtx.AgentID != "" {
		c.Set("agentID", paperclipCtx.AgentID)
		c.Header("X-Paperclip-Agent-ID", paperclipCtx.AgentID)
		if paperclipCtx.TaskID != "" {
			c.Header("X-Paperclip-Task-ID", paperclipCtx.TaskID)
		}
	}

	h.gatewayHandler.ChatCompletions(c)
}
