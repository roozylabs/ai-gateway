package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/models"
	"github.com/roozylabs/ai-gateway/internal/repository"
)

type LogsHandler struct {
	logs *repository.RequestLogRepository
}

func NewLogsHandler(logs *repository.RequestLogRepository) *LogsHandler {
	return &LogsHandler{logs: logs}
}

func (h *LogsHandler) List(c *gin.Context) {
	userID := c.GetString("userId")

	provider := c.Query("provider")
	model := c.Query("model")
	search := c.Query("search")

	status := 0
	if s := c.Query("status"); s != "" {
		status, _ = strconv.Atoi(s)
	}

	limit := 10
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	} else if l := c.Query("pageSize"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 200 {
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
	if o := c.Query("offset"); o != "" {
		if n, err := strconv.Atoi(o); err == nil && n >= 0 {
			offset = n
			page = (offset / limit) + 1
		}
	}

	logs, total, err := h.logs.ListWithFilter(c.Request.Context(), repository.LogFilter{
		UserID:   userID,
		Provider: provider,
		Model:    model,
		Status:   status,
		Search:   search,
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list logs"})
		return
	}

	if logs == nil {
		logs = []models.RequestLog{}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": logs,
		"meta": gin.H{
			"total":    total,
			"page":     page,
			"limit":    limit,
			"pageSize": limit,
		},
	})
}

func (h *LogsHandler) GetAnalytics(c *gin.Context) {
	userID := c.GetString("userId")
	days := 30
	if d := c.Query("days"); d != "" {
		if n, err := strconv.Atoi(d); err == nil && n > 0 && n <= 90 {
			days = n
		}
	}

	analytics, err := h.logs.GetLogAnalytics(c.Request.Context(), userID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "internal_error",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": analytics,
	})
}
