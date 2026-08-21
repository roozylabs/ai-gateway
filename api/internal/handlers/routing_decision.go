package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/repository"
)

type RoutingDecisionHandler struct {
	repo *repository.RoutingDecisionRepository
}

func NewRoutingDecisionHandler(repo *repository.RoutingDecisionRepository) *RoutingDecisionHandler {
	return &RoutingDecisionHandler{repo: repo}
}

func (h *RoutingDecisionHandler) List(c *gin.Context) {
	userID := c.GetString("userId")

	limit := 10
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	} else if l := c.Query("pageSize"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}

	page := 1
	if p := c.Query("page"); p != "" {
		if n, err := strconv.Atoi(p); err == nil && n > 0 {
			page = n
		}
	}

	offset := (page - 1) * limit

	decisions, total, err := h.repo.ListWithFilter(c.Request.Context(), userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list routing decisions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     decisions,
		"total":    total,
		"page":     page,
		"pageSize": limit,
	})
}
