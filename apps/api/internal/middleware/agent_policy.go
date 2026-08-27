package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/roozylabs/prism/internal/models"
)

// AgentFinder abstracts agent lookup for middleware flexibility.
type AgentFinder interface {
	FindByID(ctx context.Context, id, userID string) (*models.Agent, error)
	FindByUserAndName(ctx context.Context, userID, name string) (*models.Agent, error)
}

func AgentPolicyMiddleware(agents AgentFinder) gin.HandlerFunc {
	return func(c *gin.Context) {
		agentID := strings.TrimSpace(c.GetHeader("X-Prism-Agent-ID"))
		if agentID == "" {
			agentID = strings.TrimSpace(c.GetHeader("X-Agent-Name"))
		}
		if agentID == "" {
			c.Next()
			return
		}

		var agent *models.Agent
		var err error
		if _, uuidErr := uuid.Parse(agentID); uuidErr == nil {
			agent, err = agents.FindByID(c.Request.Context(), agentID, "")
		}
		if agent == nil {
			agent, err = agents.FindByUserAndName(c.Request.Context(), "", agentID)
		}

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
