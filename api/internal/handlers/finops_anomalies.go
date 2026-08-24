package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/repository"
)

type FinOpsAnomaliesHandler struct {
	anomalies *repository.CostAnomalyRepository
	alerts    *repository.BudgetAlertRepository
}

func NewFinOpsAnomaliesHandler(anomalies *repository.CostAnomalyRepository, alerts *repository.BudgetAlertRepository) *FinOpsAnomaliesHandler {
	return &FinOpsAnomaliesHandler{anomalies: anomalies, alerts: alerts}
}

func (h *FinOpsAnomaliesHandler) ListAnomalies(c *gin.Context) {
	limit := 50
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}
	severity := c.Query("severity")
	anomalies, err := h.anomalies.List(c.Request.Context(), limit, severity)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "Failed to fetch anomalies"}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"anomalies": anomalies})
}

func (h *FinOpsAnomaliesHandler) ListBudgetAlerts(c *gin.Context) {
	limit := 50
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}
	alerts, err := h.alerts.ListUnacknowledged(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "Failed to fetch budget alerts"}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"alerts": alerts})
}

func (h *FinOpsAnomaliesHandler) AcknowledgeAlert(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "Alert ID is required"}})
		return
	}
	if err := h.alerts.Acknowledge(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "Failed to acknowledge alert"}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Alert acknowledged"})
}
