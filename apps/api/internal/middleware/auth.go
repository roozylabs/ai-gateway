package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/repository"
)

func AuthMiddleware(sessions *repository.SessionRepository) gin.HandlerFunc {
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

		session, err := sessions.FindValidByToken(c.Request.Context(), token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		c.Set("token", token)
		c.Set("userId", session.UserID)
		c.Set("sessionId", session.ID)
		c.Next()
	}
}
