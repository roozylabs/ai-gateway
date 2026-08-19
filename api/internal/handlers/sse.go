package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	goredis "github.com/roozylabs/ai-gateway/internal/redis"
)

type SSEHandler struct {
	publisher *goredis.EventPublisher
}

func NewSSEHandler(publisher *goredis.EventPublisher) *SSEHandler {
	return &SSEHandler{publisher: publisher}
}

// Stream godoc
// @Summary      SSE event stream
// @Description  Real-time Server-Sent Events stream for live dashboard updates
// @Tags         sse
// @Security     BearerAuth
// @Success      200 {string} string "SSE stream"
// @Router       /api/sse [get]
func (h *SSEHandler) Stream(c *gin.Context) {
	pubsub := h.publisher.Subscribe(c.Request.Context())
	defer pubsub.Close()

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)

	ch := pubsub.Channel()
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	// Send initial connected event
	_, _ = c.Writer.Write([]byte("event: connected\ndata: {\"status\":\"ok\"}\n\n"))
	c.Writer.Flush()

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case <-ticker.C:
			_, _ = c.Writer.Write([]byte("event: ping\ndata: {\"status\":\"ok\"}\n\n"))
			c.Writer.Flush()
		case msg, ok := <-ch:
			if !ok {
				return
			}
			_, _ = c.Writer.Write([]byte(fmt.Sprintf("event: message\ndata: %s\n\n", msg.Payload)))
			c.Writer.Flush()
		}
	}
}
