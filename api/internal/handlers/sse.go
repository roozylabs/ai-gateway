package handlers

import (
	"fmt"
	"net/http"

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
	c.Status(http.StatusOK)

	ch := pubsub.Channel()

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			_, _ = c.Writer.Write([]byte(fmt.Sprintf("event: message\ndata: %s\n\n", msg.Payload)))
			c.Writer.Flush()
		}
	}
}
