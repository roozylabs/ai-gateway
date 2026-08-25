package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/proxy"
	"github.com/roozylabs/prism/internal/repository"
)

type DashboardHandler struct {
	requestLogs *repository.RequestLogRepository
	health      *proxy.ProviderHealthStore
}

func NewDashboardHandler(requestLogs *repository.RequestLogRepository, health *proxy.ProviderHealthStore) *DashboardHandler {
	return &DashboardHandler{requestLogs: requestLogs, health: health}
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

	var scores map[string]float64
	if h.health != nil {
		scores = h.health.Scores(c.Request.Context())
	}
	for i := range data {
		score, ok := scores[data[i].ID]
		if !ok {
			score = proxy.DefaultProviderHealthScore
		}
		data[i].HealthScore = score
	}

	c.JSON(http.StatusOK, data)
}
