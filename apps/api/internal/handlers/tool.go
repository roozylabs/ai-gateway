package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/proxy"
	"github.com/roozylabs/prism/internal/repository"
	"github.com/roozylabs/prism/internal/utils"
)

type ToolHandler struct {
	tools    *repository.ToolRepository
	backends *repository.ToolBackendRepository
	gateway  *proxy.ToolGateway
	encKey   string
}

func NewToolHandler(tools *repository.ToolRepository, backends *repository.ToolBackendRepository, gateway *proxy.ToolGateway, encKey string) *ToolHandler {
	return &ToolHandler{tools: tools, backends: backends, gateway: gateway, encKey: encKey}
}

type BackendRequest struct {
	Name        string `json:"name" binding:"required"`
	EndpointURL string `json:"endpointUrl" binding:"required"`
	AuthToken   string `json:"authToken"`
	TimeoutMs   int    `json:"timeoutMs"`
	Priority    int    `json:"priority"`
}

type CreateToolRequest struct {
	Name        string           `json:"name" binding:"required"`
	DisplayName string           `json:"displayName"`
	Description string           `json:"description"`
	InputSchema json.RawMessage  `json:"inputSchema"`
	Enabled     *bool            `json:"enabled"`
	Backends    []BackendRequest `json:"backends"`
}

func (h *ToolHandler) List(c *gin.Context) {
	userID := c.GetString("userId")
	tools, err := h.tools.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list tools: " + err.Error()})
		return
	}
	if tools == nil {
		tools = []models.Tool{}
	}
	c.JSON(http.StatusOK, tools)
}

func (h *ToolHandler) Get(c *gin.Context) {
	userID := c.GetString("userId")
	twb, err := h.tools.GetToolWithBackendsByID(c.Request.Context(), c.Param("id"), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tool not found"})
		return
	}
	c.JSON(http.StatusOK, twb)
}

func (h *ToolHandler) Create(c *gin.Context) {
	userID := c.GetString("userId")
	var req CreateToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	schema := req.InputSchema
	if len(schema) == 0 {
		schema = json.RawMessage(`{}`)
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	tool := &models.Tool{
		UserID:      userID,
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
		InputSchema: schema,
		Enabled:     enabled,
	}
	if err := h.tools.Create(c.Request.Context(), tool); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create tool"})
		return
	}

	for _, br := range req.Backends {
		if err := h.createBackend(c.Request.Context(), tool.ID, br); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "tool created but backend failed: " + br.Name})
			return
		}
	}

	twb, _ := h.tools.GetToolWithBackendsByID(c.Request.Context(), tool.ID, userID)
	c.JSON(http.StatusCreated, twb)
}

func (h *ToolHandler) Update(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")

	existing, err := h.tools.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tool not found"})
		return
	}

	var req CreateToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	existing.DisplayName = req.DisplayName
	existing.Description = req.Description
	existing.InputSchema = req.InputSchema
	if len(existing.InputSchema) == 0 {
		existing.InputSchema = json.RawMessage(`{}`)
	}
	if req.Enabled != nil {
		existing.Enabled = *req.Enabled
	}
	if err := h.tools.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update tool"})
		return
	}

	if req.Backends != nil {
		if err := h.backends.DeleteByToolID(c.Request.Context(), id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to replace backends"})
			return
		}
		for _, br := range req.Backends {
			if err := h.createBackend(c.Request.Context(), id, br); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "backend failed: " + br.Name})
				return
			}
		}
	}

	twb, _ := h.tools.GetToolWithBackendsByID(c.Request.Context(), id, userID)
	c.JSON(http.StatusOK, twb)
}

func (h *ToolHandler) Delete(c *gin.Context) {
	userID := c.GetString("userId")
	if err := h.tools.Delete(c.Request.Context(), c.Param("id"), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete tool"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "tool deleted"})
}

type TestToolRequest struct {
	Args map[string]interface{} `json:"args" binding:"required"`
}

func (h *ToolHandler) TestTool(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")

	tool, err := h.tools.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tool not found"})
		return
	}

	var req TestToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()
	result, err := h.gateway.Execute(ctx, userID, tool.Name, req.Args, h.encKey)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *ToolHandler) createBackend(ctx context.Context, toolID string, br BackendRequest) error {
	backend := &models.ToolBackend{
		ToolID:      toolID,
		Name:        br.Name,
		BackendType: "http",
		EndpointURL: br.EndpointURL,
		TimeoutMs:   br.TimeoutMs,
		Priority:    br.Priority,
		Enabled:     true,
	}
	if br.TimeoutMs <= 0 {
		backend.TimeoutMs = 30000
	}
	if br.Priority <= 0 {
		backend.Priority = 1
	}
	if br.AuthToken != "" && h.encKey != "" {
		enc, err := utils.EncryptAES256GCM(br.AuthToken, h.encKey)
		if err != nil {
			return err
		}
		backend.AuthTokenEncrypted = &enc
	}
	return h.backends.Create(ctx, backend)
}
