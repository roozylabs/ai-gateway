package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/proxy"
	"github.com/roozylabs/prism/internal/repository"
	"github.com/roozylabs/prism/internal/utils"
)

type MCPHandler struct {
	servers *repository.MCPServerRepository
	tools   *repository.MCPToolRepository
	gateway *proxy.MCPGateway
	encKey  string
}

func NewMCPHandler(servers *repository.MCPServerRepository, tools *repository.MCPToolRepository, gateway *proxy.MCPGateway, encKey string) *MCPHandler {
	return &MCPHandler{servers: servers, tools: tools, gateway: gateway, encKey: encKey}
}

type CreateMCPServerRequest struct {
	Name          string `json:"name" binding:"required"`
	DisplayName   string `json:"displayName"`
	Description   string `json:"description"`
	TransportType string `json:"transportType"`
	EndpointURL   string `json:"endpointUrl" binding:"required"`
	AuthToken     string `json:"authToken"`
	Enabled       *bool  `json:"enabled"`
}

func (h *MCPHandler) List(c *gin.Context) {
	userID := c.GetString("userId")
	servers, err := h.servers.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list mcp servers: " + err.Error()})
		return
	}
	if servers == nil {
		servers = []models.MCPServer{}
	}
	c.JSON(http.StatusOK, servers)
}

func (h *MCPHandler) Get(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	srv, err := h.servers.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "mcp server not found"})
		return
	}
	st, err := h.servers.GetServerWithTools(c.Request.Context(), srv)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load server tools: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, st)
}

func (h *MCPHandler) Create(c *gin.Context) {
	userID := c.GetString("userId")
	var req CreateMCPServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	transport := req.TransportType
	if transport == "" {
		transport = "http"
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	srv := &models.MCPServer{
		UserID:        userID,
		Name:          req.Name,
		DisplayName:   req.DisplayName,
		Description:   req.Description,
		TransportType: transport,
		EndpointURL:   req.EndpointURL,
		Status:        "connected",
		Enabled:       enabled,
	}

	if req.AuthToken != "" && h.encKey != "" {
		enc, err := utils.EncryptAES256GCM(req.AuthToken, h.encKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encrypt auth token"})
			return
		}
		srv.AuthTokenEncrypted = &enc
	}

	if err := h.servers.Create(c.Request.Context(), srv); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create mcp server: " + err.Error()})
		return
	}

	// Trigger auto-sync in background or sync immediately
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	st, err := h.gateway.SyncServerTools(ctx, srv.ID, userID, h.encKey)
	if err != nil {
		st, _ = h.servers.GetServerWithTools(c.Request.Context(), srv)
	}

	c.JSON(http.StatusCreated, st)
}

func (h *MCPHandler) Update(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	existing, err := h.servers.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "mcp server not found"})
		return
	}

	var req CreateMCPServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	existing.DisplayName = req.DisplayName
	existing.Description = req.Description
	if req.TransportType != "" {
		existing.TransportType = req.TransportType
	}
	existing.EndpointURL = req.EndpointURL
	if req.Enabled != nil {
		existing.Enabled = *req.Enabled
	}

	if req.AuthToken != "" && h.encKey != "" {
		enc, err := utils.EncryptAES256GCM(req.AuthToken, h.encKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encrypt auth token"})
			return
		}
		existing.AuthTokenEncrypted = &enc
	}

	if err := h.servers.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update mcp server"})
		return
	}

	st, _ := h.servers.GetServerWithTools(c.Request.Context(), existing)
	c.JSON(http.StatusOK, st)
}

func (h *MCPHandler) Delete(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	if err := h.servers.Delete(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete mcp server"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "mcp server deleted"})
}

func (h *MCPHandler) Sync(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	st, err := h.gateway.SyncServerTools(ctx, id, userID, h.encKey)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "sync failed: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, st)
}

type TestMCPToolRequest struct {
	Tool string                 `json:"tool" binding:"required"`
	Args map[string]interface{} `json:"args"`
}

func (h *MCPHandler) TestTool(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	srv, err := h.servers.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "mcp server not found"})
		return
	}

	var req TestMCPToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()
	res, err := h.gateway.ExecuteTool(ctx, userID, srv.Name, req.Tool, req.Args, h.encKey)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}
