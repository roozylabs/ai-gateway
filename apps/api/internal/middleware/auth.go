package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/repository"
	"github.com/roozylabs/prism/internal/utils"
)

func AuthMiddleware(sessions *repository.SessionRepository, keys GatewayKeyFinder) gin.HandlerFunc {
	return func(c *gin.Context) {
		var token string

		// 1. Try Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				token = parts[1]
			}
		}

		// 2. Try Cookie fallback
		if token == "" {
			if cookie, err := c.Cookie("auth_token"); err == nil && cookie != "" {
				token = cookie
			}
		}

		// 3. Try Query param fallback (for SSE EventSource)
		if token == "" {
			token = c.Query("token")
		}

		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization token"})
			return
		}

		// 4. Gateway API Key support (gw_sk_...) for CLI & SDK access
		if strings.HasPrefix(token, "gw_sk_") && keys != nil {
			keyHash := utils.HashSHA256(token)
			gatewayKey, err := keys.FindByKeyHash(c.Request.Context(), keyHash)
			if err == nil && gatewayKey != nil {
				if gatewayKey.ExpiresAt != nil && gatewayKey.ExpiresAt.Before(time.Now()) {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "API key has expired"})
					return
				}
				c.Set("token", token)
				c.Set("userId", gatewayKey.UserID)
				c.Set("userID", gatewayKey.UserID)
				c.Set("user_id", gatewayKey.UserID)
				c.Set("gatewayKey", gatewayKey)
				c.Next()
				return
			}
		}

		// 5. Session auth fallback for Web Admin Dashboard
		session, err := sessions.FindValidByToken(c.Request.Context(), token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		c.Set("token", token)
		c.Set("userId", session.UserID)
		c.Set("userID", session.UserID)
		c.Set("user_id", session.UserID)
		c.Set("sessionId", session.ID)
		c.Next()
	}
}
