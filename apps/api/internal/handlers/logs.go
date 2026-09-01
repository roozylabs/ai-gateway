package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/httputil"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/repository"
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
		httputil.RespondInternalError(c, "Failed to list request logs", err, "LOGS_LIST_FAILED")
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
		httputil.RespondInternalError(c, "Failed to retrieve log analytics", err, "LOGS_ANALYTICS_FAILED")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": analytics,
	})
}
