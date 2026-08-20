package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/redis"
)

type ActiveStreamsHandler struct {
	cooldown *redis.CooldownStore
}

func NewActiveStreamsHandler(cooldown *redis.CooldownStore) *ActiveStreamsHandler {
	return &ActiveStreamsHandler{cooldown: cooldown}
}

func (h *ActiveStreamsHandler) GetActiveStreams(c *gin.Context) {
	summary, err := h.cooldown.GetActiveStreams(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active streams: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}
