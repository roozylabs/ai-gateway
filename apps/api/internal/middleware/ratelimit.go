package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	goredis "github.com/redis/go-redis/v9"
	"github.com/roozylabs/prism/internal/httputil"
	"github.com/roozylabs/prism/internal/models"
)

func GatewayRateLimitMiddleware(rdb *goredis.Client, limit int) gin.HandlerFunc {
	return func(c *gin.Context) {
		gatewayKey := c.MustGet("gatewayKey").(*models.GatewayAPIKey)
		tc := GetTenantContext(c)
		key := fmt.Sprintf("tenant:%s:gateway:%s:rate_limit", tc.OrgID, gatewayKey.KeyHash)

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
			httputil.RespondError(c, http.StatusTooManyRequests, "Rate limit exceeded", nil, "RATE_LIMIT_EXCEEDED")
			return
		}

		c.Next()
	}
}
