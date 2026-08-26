package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/repository"
)

type MCPRegistryHandler struct {
	repo *repository.MCPRegistryRepository
}

func NewMCPRegistryHandler(repo *repository.MCPRegistryRepository) *MCPRegistryHandler {
	return &MCPRegistryHandler{repo: repo}
}

type RegisterMCPCatalogRequest struct {
	Name          string          `json:"name" binding:"required"`
	Slug          string          `json:"slug" binding:"required"`
	Description   string          `json:"description"`
	ServerURL     string          `json:"serverUrl" binding:"required"`
	TransportType string          `json:"transportType"`
	Visibility    string          `json:"visibility"`
	Capabilities  json.RawMessage `json:"capabilities"`
}

func (h *MCPRegistryHandler) ListCatalog(c *gin.Context) {
	userID := c.GetString("userId")
	servers, err := h.repo.ListPublicAndTenant(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "Failed to list MCP catalog: " + err.Error(), "type": "internal_error"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"object": "list",
		"data":   servers,
	})
}

func (h *MCPRegistryHandler) GetCatalogBySlug(c *gin.Context) {
	slug := c.Param("slug")
	server, err := h.repo.FindBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"message": "MCP server not found in catalog", "type": "not_found_error"},
		})
		return
	}

	c.JSON(http.StatusOK, server)
}

func (h *MCPRegistryHandler) RegisterServer(c *gin.Context) {
	userID := c.GetString("userId")
	var req RegisterMCPCatalogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"message": "Invalid request payload: " + err.Error(), "type": "invalid_request_error"},
		})
		return
	}

	if req.TransportType == "" {
		req.TransportType = "sse"
	}
	if req.Visibility == "" {
		req.Visibility = "private"
	}
	if len(req.Capabilities) == 0 {
		req.Capabilities = json.RawMessage("{}")
	}

	server := &models.MCPRegistryServer{
		UserID:        userID,
		Name:          req.Name,
		Slug:          req.Slug,
		Description:   req.Description,
		ServerURL:     req.ServerURL,
		TransportType: req.TransportType,
		Visibility:    req.Visibility,
		Capabilities:  req.Capabilities,
		IsVerified:    false,
	}

	if err := h.repo.Create(c.Request.Context(), server); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "Failed to register MCP server: " + err.Error(), "type": "internal_error"},
		})
		return
	}

	c.JSON(http.StatusCreated, server)
}
