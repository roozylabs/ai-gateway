package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
)

// AgentFinder abstracts agent lookup for middleware flexibility.
type AgentFinder interface {
	FindByID(ctx context.Context, id, userID string) (*models.Agent, error)
}

func AgentPolicyMiddleware(agents AgentFinder) gin.HandlerFunc {
	return func(c *gin.Context) {
		agentID := strings.TrimSpace(c.GetHeader("X-Prism-Agent-ID"))
		if agentID == "" {
			c.Next()
			return
		}

		agent, err := agents.FindByID(c.Request.Context(), agentID, "")
		if err != nil || agent == nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"message": "Agent identity specified in X-Prism-Agent-ID was not found",
					"type":    "permission_denied",
				},
			})
			return
		}

		if !agent.Enabled {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"message": "Agent specified in X-Prism-Agent-ID is disabled",
					"type":    "permission_denied",
				},
			})
			return
		}

		c.Set("agentID", agent.ID)
		c.Set("agentName", agent.Name)
		c.Set("agentObject", agent)

		c.Next()
	}
}
