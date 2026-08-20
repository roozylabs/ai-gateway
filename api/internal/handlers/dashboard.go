package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/repository"
)

type DashboardHandler struct {
	requestLogs *repository.RequestLogRepository
}

func NewDashboardHandler(requestLogs *repository.RequestLogRepository) *DashboardHandler {
	return &DashboardHandler{requestLogs: requestLogs}
}

func (h *DashboardHandler) GetStats(c *gin.Context) {
	userID := c.GetString("userId")
	stats, err := h.requestLogs.GetStats(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get stats"})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *DashboardHandler) GetUsageChart(c *gin.Context) {
	userID := c.GetString("userId")
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")
	days := 30
	if d := c.Query("days"); d != "" {
		if n, err := strconv.Atoi(d); err == nil && n > 0 {
			if n > 30 {
				days = 30
			} else {
				days = n
			}
		}
	}
	data, err := h.requestLogs.GetUsageChart(c.Request.Context(), userID, days, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get usage chart"})
		return
	}
	if data == nil {
		data = []repository.UsagePoint{}
	}
	c.JSON(http.StatusOK, data)
}

func (h *DashboardHandler) GetProviderHealth(c *gin.Context) {
	userID := c.GetString("userId")
	data, err := h.requestLogs.GetProviderHealth(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get provider health"})
		return
	}
	if data == nil {
		data = []repository.ProviderHealth{}
	}
	c.JSON(http.StatusOK, data)
}
