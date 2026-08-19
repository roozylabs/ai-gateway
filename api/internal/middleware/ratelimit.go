package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	goredis "github.com/redis/go-redis/v9"
	"github.com/roozylabs/ai-gateway/internal/models"
)

func GatewayRateLimitMiddleware(rdb *goredis.Client, limit int) gin.HandlerFunc {
	return func(c *gin.Context) {
		gatewayKey := c.MustGet("gatewayKey").(*models.GatewayAPIKey)
		key := fmt.Sprintf("gateway:%s:rate_limit", gatewayKey.KeyHash)

		now := time.Now().UnixMilli()
		window := now - 60000

		ctx := c.Request.Context()
		pipe := rdb.Pipeline()
		pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", window))
		countCmd := pipe.ZCard(ctx, key)
		pipe.ZAdd(ctx, key, goredis.Z{Score: float64(now), Member: fmt.Sprintf("%d:%d", now, gatewayKey.RequestCount)})
		pipe.Expire(ctx, key, 2*time.Minute)

		if _, err := pipe.Exec(ctx); err != nil {
			c.Next()
			return
		}

		if countCmd.Val() >= int64(limit) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": gin.H{
					"message": "Rate limit exceeded",
					"type":    "rate_limit_error",
				},
			})
			return
		}

		c.Next()
	}
}
