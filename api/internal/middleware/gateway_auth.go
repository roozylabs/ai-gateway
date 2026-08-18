package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/username/ai-gateway/internal/repository"
	"github.com/username/ai-gateway/internal/utils"
)

func GatewayAuthMiddleware(keys *repository.GatewayKeyRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"message": "Missing API key", "type": "invalid_request_error"},
			})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"message": "Invalid API key format", "type": "invalid_request_error"},
			})
			return
		}

		rawKey := parts[1]
		if !strings.HasPrefix(rawKey, "gw_sk_") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"message": "Invalid API key prefix", "type": "invalid_request_error"},
			})
			return
		}

		keyHash := utils.HashSHA256(rawKey)
		gatewayKey, err := keys.FindByKeyHash(c.Request.Context(), keyHash)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"message": "Invalid API key", "type": "invalid_request_error"},
			})
			return
		}

		if gatewayKey.ExpiresAt != nil && gatewayKey.ExpiresAt.Before(time.Now()) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"message": "API key has expired", "type": "invalid_request_error"},
			})
			return
		}

		c.Set("gatewayKey", gatewayKey)
		c.Next()
	}
}
