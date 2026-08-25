package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
)

const (
	TenantContextKey = "tenant_context"
	DefaultOrgID     = "org_default"
	DefaultWsID      = "ws_default"
	DefaultProjID    = "proj_default"
)

// TenantMiddleware extracts tenant identification headers (or applies default boundaries)
// and attaches TenantContext to the Gin context.
func TenantMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := c.GetHeader("X-Prism-Org-ID")
		if orgID == "" {
			orgID = DefaultOrgID
		}

		wsID := c.GetHeader("X-Prism-Workspace-ID")
		if wsID == "" {
			wsID = DefaultWsID
		}

		projID := c.GetHeader("X-Prism-Project-ID")
		if projID == "" {
			projID = DefaultProjID
		}

		tc := models.TenantContext{
			OrgID:       orgID,
			WorkspaceID: wsID,
			ProjectID:   projID,
		}

		c.Set(TenantContextKey, tc)
		c.Next()
	}
}

// GetTenantContext retrieves TenantContext from Gin context.
func GetTenantContext(c *gin.Context) models.TenantContext {
	val, exists := c.Get(TenantContextKey)
	if !exists {
		return models.TenantContext{
			OrgID:       DefaultOrgID,
			WorkspaceID: DefaultWsID,
			ProjectID:   DefaultProjID,
		}
	}

	tc, ok := val.(models.TenantContext)
	if !ok {
		return models.TenantContext{
			OrgID:       DefaultOrgID,
			WorkspaceID: DefaultWsID,
			ProjectID:   DefaultProjID,
		}
	}

	return tc
}
