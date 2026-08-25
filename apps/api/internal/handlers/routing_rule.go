package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/repository"
)

type RoutingRuleHandler struct {
	routingRepo *repository.RoutingRuleRepository
}

func NewRoutingRuleHandler(routingRepo *repository.RoutingRuleRepository) *RoutingRuleHandler {
	return &RoutingRuleHandler{routingRepo: routingRepo}
}

func (h *RoutingRuleHandler) List(c *gin.Context) {
	userID := c.GetString("userId")
	rules, err := h.routingRepo.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"type": "server_error", "message": "Failed to fetch routing rules"}})
		return
	}
	if rules == nil {
		rules = []models.RoutingRule{}
	}
	c.JSON(http.StatusOK, rules)
}

func (h *RoutingRuleHandler) Get(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")

	rule, err := h.routingRepo.GetByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"type": "not_found", "message": "Routing rule not found"}})
		return
	}
	c.JSON(http.StatusOK, rule)
}

type CreateRoutingRuleRequest struct {
	ModelPattern string  `json:"modelPattern" binding:"required"`
	ProviderID   *string `json:"providerId"`
	Priority     int     `json:"priority"`
	Enabled      *bool   `json:"enabled"`
}

func (h *RoutingRuleHandler) Create(c *gin.Context) {
	userID := c.GetString("userId")

	var req CreateRoutingRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"type": "invalid_request", "message": "Invalid request body"}})
		return
	}

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	rule := &models.RoutingRule{
		UserID:       userID,
		ModelPattern: req.ModelPattern,
		ProviderID:   req.ProviderID,
		Priority:     req.Priority,
		Enabled:      enabled,
	}

	if err := h.routingRepo.Create(c.Request.Context(), rule); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"type": "server_error", "message": "Failed to create routing rule"}})
		return
	}

	c.JSON(http.StatusCreated, rule)
}

type UpdateRoutingRuleRequest struct {
	ModelPattern string  `json:"modelPattern"`
	ProviderID   *string `json:"providerId"`
	Priority     *int    `json:"priority"`
	Enabled      *bool   `json:"enabled"`
}

func (h *RoutingRuleHandler) Update(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")

	existing, err := h.routingRepo.GetByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"type": "not_found", "message": "Routing rule not found"}})
		return
	}

	var req UpdateRoutingRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"type": "invalid_request", "message": "Invalid request body"}})
		return
	}

	if req.ModelPattern != "" {
		existing.ModelPattern = req.ModelPattern
	}
	if req.ProviderID != nil {
		existing.ProviderID = req.ProviderID
	}
	if req.Priority != nil {
		existing.Priority = *req.Priority
	}
	if req.Enabled != nil {
		existing.Enabled = *req.Enabled
	}

	if err := h.routingRepo.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"type": "server_error", "message": "Failed to update routing rule"}})
		return
	}

	c.JSON(http.StatusOK, existing)
}

func (h *RoutingRuleHandler) Delete(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")

	if err := h.routingRepo.Delete(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"type": "server_error", "message": "Failed to delete routing rule"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Routing rule deleted"})
}
