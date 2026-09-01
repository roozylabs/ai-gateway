package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/httputil"
	"github.com/roozylabs/prism/internal/repository"
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
		httputil.RespondInternalError(c, "Failed to fetch anomalies", err, "ANOMALIES_FETCH_FAILED")
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
	userID := c.GetString("userId")
	alerts, err := h.alerts.ListUnacknowledged(c.Request.Context(), limit, userID)
	if err != nil {
		httputil.RespondInternalError(c, "Failed to fetch budget alerts", err, "BUDGET_ALERTS_FETCH_FAILED")
		return
	}
	c.JSON(http.StatusOK, gin.H{"alerts": alerts})
}

func (h *FinOpsAnomaliesHandler) AcknowledgeAlert(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		httputil.RespondBadRequest(c, "Alert ID is required", nil, "ALERT_ID_REQUIRED")
		return
	}
	if err := h.alerts.Acknowledge(c.Request.Context(), id); err != nil {
		httputil.RespondInternalError(c, "Failed to acknowledge alert", err, "ALERT_ACKNOWLEDGE_FAILED")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Alert acknowledged"})
}
