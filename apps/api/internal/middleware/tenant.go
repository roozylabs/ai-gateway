// Package middleware provides HTTP middlewares and canonical context resolvers.
package middleware

import (
	"context"
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

var (
	ErrCrossTenantForbidden = errors.New("cross-organization tenant context forbidden: gateway key belongs to different organization")
	ErrOrgMembershipRequired = errors.New("organization membership required: user is not a member of requested organization")
)

// OrgMemberChecker abstracts checking if a user belongs to an organization.
type OrgMemberChecker interface {
	IsMember(ctx context.Context, userID, orgID string) (bool, error)
}

// ResolveCanonicalTenantContext resolves authoritative TenantContext.
// GatewayKey is authoritative for OrgID ownership. Client-provided headers can only narrow scope.
func ResolveCanonicalTenantContext(c *gin.Context, gatewayKey *models.GatewayAPIKey, orgChecker ...OrgMemberChecker) (models.TenantContext, error) {
	var checker OrgMemberChecker
	if len(orgChecker) > 0 {
		checker = orgChecker[0]
	}

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
		// Session-authenticated user specifying X-Prism-Org-ID header
		userID := ""
		if c != nil {
			userID = c.GetString("userId")
		}
		if userID != "" && checker != nil {
			isMember, err := checker.IsMember(c.Request.Context(), userID, headerOrgID)
			if err != nil || !isMember {
				return models.TenantContext{}, ErrOrgMembershipRequired
			}
		}
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
func TenantMiddleware(orgChecker ...OrgMemberChecker) gin.HandlerFunc {
	var checker OrgMemberChecker
	if len(orgChecker) > 0 {
		checker = orgChecker[0]
	}

	return func(c *gin.Context) {
		var gwKey *models.GatewayAPIKey
		if val, exists := c.Get("gatewayKey"); exists {
			if keyObj, ok := val.(*models.GatewayAPIKey); ok {
				gwKey = keyObj
			}
		}

		tc, err := ResolveCanonicalTenantContext(c, gwKey, checker)
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
