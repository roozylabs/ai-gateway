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
)

var (
	ErrCrossTenantForbidden  = errors.New("cross-organization tenant context forbidden: gateway key belongs to different organization")
	ErrOrgMembershipRequired = errors.New("organization membership required: user is not a member of requested organization")
	ErrMissingTenantContext  = errors.New("tenant context required: X-Prism-Org-ID header or gateway key must be provided")
)

// OrgMemberChecker abstracts checking if a user belongs to an organization.
type OrgMemberChecker interface {
	IsMember(ctx context.Context, userID, orgID string) (bool, error)
}

// ResolveCanonicalTenantContext resolves authoritative TenantContext.
// GatewayKey is authoritative for OrgID ownership. Client-provided headers can only narrow scope.
// Evaluation is strictly fail-closed: missing tenant context or failed membership checks return explicit errors.
func ResolveCanonicalTenantContext(c *gin.Context, gatewayKey *models.GatewayAPIKey, orgChecker ...OrgMemberChecker) (models.TenantContext, error) {
	var checker OrgMemberChecker
	if len(orgChecker) > 0 {
		checker = orgChecker[0]
	}

	headerOrgID := ""
	headerWsID := ""
	headerProjID := ""
	if c != nil {
		headerOrgID = c.GetHeader("X-Prism-Org-ID")
		headerWsID = c.GetHeader("X-Prism-Workspace-ID")
		headerProjID = c.GetHeader("X-Prism-Project-ID")
	}

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
			if userID == "" {
				userID = c.GetString("user_id")
			}
		}
		// Strict fail-closed: both authenticated user ID and membership checker MUST be present
		if userID == "" {
			return models.TenantContext{}, ErrOrgMembershipRequired
		}
		if checker == nil {
			return models.TenantContext{}, ErrOrgMembershipRequired
		}
		isMember, err := checker.IsMember(c.Request.Context(), userID, headerOrgID)
		if err != nil || !isMember {
			return models.TenantContext{}, ErrOrgMembershipRequired
		}
		canonicalOrgID = headerOrgID
	} else {
		// Strict fail-closed: no implicit fallback to default organization
		return models.TenantContext{}, ErrMissingTenantContext
	}

	canonicalWsID := headerWsID
	if canonicalWsID == "" {
		if gatewayKey != nil && gatewayKey.WorkspaceID != nil && *gatewayKey.WorkspaceID != "" {
			canonicalWsID = *gatewayKey.WorkspaceID
		}
		// Empty string represents organization-wide scope (no dummy ws_default)
	}

	canonicalProjID := headerProjID
	if canonicalProjID == "" {
		if gatewayKey != nil && gatewayKey.ProjectID != nil && *gatewayKey.ProjectID != "" {
			canonicalProjID = *gatewayKey.ProjectID
		}
		// Empty string represents workspace-wide scope (no dummy proj_default)
	}

	tc := models.TenantContext{
		OrgID:       canonicalOrgID,
		WorkspaceID: canonicalWsID,
		ProjectID:   canonicalProjID,
	}

	if c != nil {
		c.Set(TenantContextKey, tc)
		c.Set("organization_id", tc.OrgID)
		c.Set("organizationId", tc.OrgID)
		c.Set("workspace_id", tc.WorkspaceID)
		c.Set("project_id", tc.ProjectID)
	}

	return tc, nil
}

// TenantMiddleware extracts tenant identification headers (or applies gateway key boundaries)
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
		c.Set("organization_id", tc.OrgID)
		c.Set("organizationId", tc.OrgID)
		c.Set("workspace_id", tc.WorkspaceID)
		c.Set("project_id", tc.ProjectID)
		c.Next()
	}
}

// GetTenantContext retrieves TenantContext from Gin context. Returns empty TenantContext if not found.
func GetTenantContext(c *gin.Context) models.TenantContext {
	if c == nil {
		return models.TenantContext{}
	}
	val, exists := c.Get(TenantContextKey)
	if !exists {
		return models.TenantContext{}
	}

	tc, ok := val.(models.TenantContext)
	if !ok {
		return models.TenantContext{}
	}

	return tc
}
