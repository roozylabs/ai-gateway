// Package middleware provides HTTP middlewares and canonical context resolvers.
package middleware

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
)

const (
	TenantContextKey = "tenant_context"
	DefaultOrgID     = "org_default"
	DefaultWsID      = "ws_default"
	DefaultProjID    = "proj_default"
)

var ErrCrossTenantForbidden = errors.New("cross-organization tenant context forbidden: gateway key belongs to different organization")

// ResolveCanonicalTenantContext resolves authoritative TenantContext.
// GatewayKey is authoritative for OrgID ownership. Client-provided headers can only narrow scope.
func ResolveCanonicalTenantContext(c *gin.Context, gatewayKey *models.GatewayAPIKey) (models.TenantContext, error) {
	headerOrgID := c.GetHeader("X-Prism-Org-ID")
	headerWsID := c.GetHeader("X-Prism-Workspace-ID")
	headerProjID := c.GetHeader("X-Prism-Project-ID")

	var canonicalOrgID string
	if gatewayKey != nil && gatewayKey.OrgID != nil && *gatewayKey.OrgID != "" {
		canonicalOrgID = *gatewayKey.OrgID
		// Reject client header spoofing another organization
		if headerOrgID != "" && headerOrgID != canonicalOrgID {
			return models.TenantContext{}, ErrCrossTenantForbidden
		}
	} else if headerOrgID != "" {
		canonicalOrgID = headerOrgID
	} else {
		canonicalOrgID = DefaultOrgID
	}

	canonicalWsID := headerWsID
	if canonicalWsID == "" {
		if gatewayKey != nil && gatewayKey.WorkspaceID != nil && *gatewayKey.WorkspaceID != "" {
			canonicalWsID = *gatewayKey.WorkspaceID
		} else {
			canonicalWsID = DefaultWsID
		}
	}

	canonicalProjID := headerProjID
	if canonicalProjID == "" {
		if gatewayKey != nil && gatewayKey.ProjectID != nil && *gatewayKey.ProjectID != "" {
			canonicalProjID = *gatewayKey.ProjectID
		} else {
			canonicalProjID = DefaultProjID
		}
	}

	tc := models.TenantContext{
		OrgID:       canonicalOrgID,
		WorkspaceID: canonicalWsID,
		ProjectID:   canonicalProjID,
	}

	if c != nil {
		c.Set(TenantContextKey, tc)
	}

	return tc, nil
}

// TenantMiddleware extracts tenant identification headers (or applies default boundaries)
// and attaches TenantContext to the Gin context.
func TenantMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var gwKey *models.GatewayAPIKey
		if val, exists := c.Get("gatewayKey"); exists {
			if keyObj, ok := val.(*models.GatewayAPIKey); ok {
				gwKey = keyObj
			}
		}

		tc, err := ResolveCanonicalTenantContext(c, gwKey)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"message": err.Error(),
					"type":    "tenant_security_error",
				},
			})
			return
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
