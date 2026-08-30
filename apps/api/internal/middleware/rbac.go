package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/authz"
	"github.com/roozylabs/prism/internal/models"
)

// RequirePermission creates a Gin middleware ensuring the authenticated caller has the required permission.
func RequirePermission(authzEngine *authz.AuthorizationEngine, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if authzEngine == nil {
			c.Next()
			return
		}

		userID := c.GetString("userId")
		if userID == "" {
			userID = c.GetString("user_id")
		}
		if userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"message": "Authentication required",
					"type":    "unauthorized_error",
				},
			})
			return
		}

		orgID := c.GetString("organization_id")
		if orgID == "" {
			orgID = c.GetString("organizationId")
		}
		wsID := c.GetString("workspace_id")

		pType := authz.PrincipalHumanUser
		var allowedModels []string
		if gwKeyVal, exists := c.Get("gatewayKey"); exists {
			if gwKey, ok := gwKeyVal.(*models.GatewayAPIKey); ok {
				pType = authz.PrincipalGatewayKey
				if gwKey.OrgID != nil {
					orgID = *gwKey.OrgID
				}
				if gwKey.WorkspaceID != nil {
					wsID = *gwKey.WorkspaceID
				}
			}
		}

		principal := &authz.Principal{
			Type:          pType,
			ID:            userID,
			OrgID:         orgID,
			WorkspaceID:   wsID,
			AllowedModels: allowedModels,
		}

		target := &authz.ResourceContext{
			OrgID:       orgID,
			WorkspaceID: wsID,
		}

		allowed, err := authzEngine.Can(c.Request.Context(), principal, action, target)
		if err != nil || !allowed {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"message": "Forbidden: insufficient permissions for action " + action,
					"action":  action,
					"type":    "authorization_error",
				},
			})
			return
		}

		c.Next()
	}
}
