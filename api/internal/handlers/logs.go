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

	limit := 50
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}

	offset := 0
	if o := c.Query("offset"); o != "" {
		offset, _ = strconv.Atoi(o)
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
		"value": logs,
		"count": total,
	})
}
