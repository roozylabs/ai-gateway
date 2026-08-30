package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	redis "github.com/redis/go-redis/v9"
	goredis "github.com/roozylabs/prism/internal/redis"
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
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache, no-transform")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Header("Transfer-Encoding", "chunked")
	c.Status(http.StatusOK)

	// Send initial connected event immediately
	if _, err := fmt.Fprint(c.Writer, "event: connected\ndata: {\"status\":\"ok\"}\n\n"); err != nil {
		return
	}
	c.Writer.Flush()

	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	var pubsub *redis.PubSub
	var ch <-chan *redis.Message
	if h.publisher != nil {
		pubsub = h.publisher.Subscribe(c.Request.Context())
		if pubsub != nil {
			defer func() { _ = pubsub.Close() }()
			ch = pubsub.Channel()
		}
	}

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case <-ticker.C:
			if _, err := fmt.Fprint(c.Writer, ": ping\nevent: ping\ndata: {\"status\":\"ok\"}\n\n"); err != nil {
				return
			}
			c.Writer.Flush()
		case msg, ok := <-ch:
			if !ok {
				// Redis subscription channel was closed or disconnected; try to resubscribe after a short backoff without dropping client SSE connection
				if pubsub != nil {
					_ = pubsub.Close()
				}
				time.Sleep(1 * time.Second)
				if h.publisher != nil {
					pubsub = h.publisher.Subscribe(c.Request.Context())
					if pubsub != nil {
						ch = pubsub.Channel()
					}
				}
				continue
			}
			if _, err := fmt.Fprintf(c.Writer, "event: message\ndata: %s\n\n", msg.Payload); err != nil {
				return
			}
			c.Writer.Flush()
		}
	}
}
