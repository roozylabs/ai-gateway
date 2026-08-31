package security_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/authz"
	"github.com/roozylabs/prism/internal/middleware"
	"github.com/roozylabs/prism/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// MockPermissionFinder provides deterministic test responses for RBAC evaluations.
type MockPermissionFinder struct {
	Permissions map[string]map[string][]string // userID -> orgID -> permissions
	Roles       map[string]map[string]string   // userID -> orgID -> roleSlug
	SimulateErr error
}

func (m *MockPermissionFinder) GetUserPermissions(ctx context.Context, userID, orgID string) ([]string, string, error) {
	if m.SimulateErr != nil {
		return nil, "", m.SimulateErr
	}
	if orgMap, ok := m.Permissions[userID]; ok {
		if perms, ok := orgMap[orgID]; ok {
			role := m.Roles[userID][orgID]
			return perms, role, nil
		}
	}
	return nil, "", repository.ErrNotMember
}

type MockWorkspaceMemberFinder struct {
	WorkspaceRoles map[string]map[string]string // wsID -> userID -> role
	SimulateErr    error
}

func (m *MockWorkspaceMemberFinder) GetWorkspaceMemberRole(ctx context.Context, wsID, userID string) (string, error) {
	if m.SimulateErr != nil {
		return "", m.SimulateErr
	}
	if wsMap, ok := m.WorkspaceRoles[wsID]; ok {
		if role, ok := wsMap[userID]; ok {
			return role, nil
		}
	}
	return "", repository.ErrNotMember
}

// 1. Authentication Vector: Unauthenticated / Empty Principals -> DENY
func TestAuthz_AuthenticationFailClosed(t *testing.T) {
	engine := authz.NewAuthorizationEngine(&MockPermissionFinder{}, &MockWorkspaceMemberFinder{})
	ctx := context.Background()

	// Unauthenticated / nil principal
	allowed, err := engine.Can(ctx, nil, "api_key:read", nil)
	assert.False(t, allowed)
	assert.ErrorIs(t, err, authz.ErrUnauthorized)

	// Empty ID principal
	emptyPrincipal := &authz.Principal{ID: ""}
	allowed, err = engine.Can(ctx, emptyPrincipal, "api_key:read", nil)
	assert.False(t, allowed)
	assert.ErrorIs(t, err, authz.ErrUnauthorized)

	// Empty Action
	validPrincipal := &authz.Principal{ID: "usr_123", OrgID: "org_1"}
	allowed, err = engine.Can(ctx, validPrincipal, "", nil)
	assert.False(t, allowed)
	assert.ErrorIs(t, err, authz.ErrInvalidAction)
}

// 2. Organization Boundary Vector: Zero Cross-Tenant Access -> DENY
func TestAuthz_OrganizationIsolation(t *testing.T) {
	engine := authz.NewAuthorizationEngine(&MockPermissionFinder{}, &MockWorkspaceMemberFinder{})
	ctx := context.Background()

	principalOrgA := &authz.Principal{
		Type:        authz.PrincipalHumanUser,
		ID:          "usr_alpha",
		OrgID:       "org_alpha",
		RoleSlug:    "owner",
		Permissions: []string{"agent:read", "agent:create"},
	}

	// Access resource in same Org A -> ALLOW
	allowed, err := engine.Can(ctx, principalOrgA, "agent:read", &authz.ResourceContext{
		Type:  "agent",
		ID:    "agent_1",
		OrgID: "org_alpha",
	})
	require.NoError(t, err)
	assert.True(t, allowed, "Member must access own organization resource")

	// Attempt access resource in Org B -> DENY
	allowed, err = engine.Can(ctx, principalOrgA, "agent:read", &authz.ResourceContext{
		Type:  "agent",
		ID:    "agent_2",
		OrgID: "org_beta",
	})
	assert.False(t, allowed, "Cross-tenant access must be denied")
	assert.ErrorIs(t, err, authz.ErrCrossTenantDenied)
}

// 3. Mandatory Workspace RBAC Vector: Membership Verification & Scope Bounds
func TestAuthz_WorkspaceIsolation(t *testing.T) {
	wsFinder := &MockWorkspaceMemberFinder{
		WorkspaceRoles: map[string]map[string]string{
			"ws_eng": {
				"usr_dev": "developer",
			},
		},
	}
	engine := authz.NewAuthorizationEngine(&MockPermissionFinder{}, wsFinder)
	ctx := context.Background()

	// Principal with workspace scope matching membership
	principalWsEng := &authz.Principal{
		Type:        authz.PrincipalHumanUser,
		ID:          "usr_dev",
		OrgID:       "org_corp",
		WorkspaceID: "ws_eng",
		RoleSlug:    "developer",
		Permissions: []string{"agent:read", "agent:execute"},
	}

	// Access resource in authorized workspace -> ALLOW
	allowed, err := engine.Can(ctx, principalWsEng, "agent:read", &authz.ResourceContext{
		Type:        "agent",
		OrgID:       "org_corp",
		WorkspaceID: "ws_eng",
	})
	require.NoError(t, err)
	assert.True(t, allowed)

	// Attempt access resource in different workspace with bound scope -> DENY
	allowed, err = engine.Can(ctx, principalWsEng, "agent:read", &authz.ResourceContext{
		Type:        "agent",
		OrgID:       "org_corp",
		WorkspaceID: "ws_finance",
	})
	assert.False(t, allowed, "Cross-workspace access must be strictly denied")
	assert.ErrorIs(t, err, authz.ErrCrossWorkspaceDenied)

	// Principal with empty WorkspaceID (org-level user) attempting to access ws_finance without membership -> DENY
	principalUnbound := &authz.Principal{
		Type:        authz.PrincipalHumanUser,
		ID:          "usr_dev",
		OrgID:       "org_corp",
		WorkspaceID: "", // unbound workspace
		RoleSlug:    "developer",
		Permissions: []string{"agent:read", "agent:execute"},
	}

	allowed, err = engine.Can(ctx, principalUnbound, "agent:read", &authz.ResourceContext{
		Type:        "agent",
		OrgID:       "org_corp",
		WorkspaceID: "ws_finance", // user is NOT a member of ws_finance
	})
	assert.False(t, allowed, "Unbound org user must NOT bypass workspace membership check")
	assert.ErrorIs(t, err, authz.ErrCrossWorkspaceDenied)
}

// 4. Workspace Admin Override: Org-level workspace:admin permission allows cross-workspace access
func TestAuthz_WorkspaceAdminOverride(t *testing.T) {
	// wsFinder has no explicit workspace membership for this user
	wsFinder := &MockWorkspaceMemberFinder{
		WorkspaceRoles: map[string]map[string]string{},
	}
	engine := authz.NewAuthorizationEngine(&MockPermissionFinder{}, wsFinder)
	ctx := context.Background()

	// Admin principal with workspace:admin permission
	adminUser := &authz.Principal{
		Type:        authz.PrincipalHumanUser,
		ID:          "usr_admin",
		OrgID:       "org_corp",
		RoleSlug:    "owner",
		Permissions: []string{"workspace:admin", "agent:read"},
	}

	// Access resource in any workspace within same organization -> ALLOW
	allowed, err := engine.Can(ctx, adminUser, "agent:read", &authz.ResourceContext{
		Type:        "agent",
		OrgID:       "org_corp",
		WorkspaceID: "ws_restricted",
	})
	require.NoError(t, err)
	assert.True(t, allowed, "User with workspace:admin must have administrative override across workspaces")

	// Regular user without workspace:admin and without workspace membership -> DENY
	regularUser := &authz.Principal{
		Type:        authz.PrincipalHumanUser,
		ID:          "usr_regular",
		OrgID:       "org_corp",
		RoleSlug:    "developer",
		Permissions: []string{"agent:read"},
	}

	allowed, err = engine.Can(ctx, regularUser, "agent:read", &authz.ResourceContext{
		Type:        "agent",
		OrgID:       "org_corp",
		WorkspaceID: "ws_restricted",
	})
	assert.False(t, allowed, "User without workspace:admin and without membership must be denied")
	assert.ErrorIs(t, err, authz.ErrCrossWorkspaceDenied)
}

// 5. Least-Privilege Role Enforcement
func TestAuthz_RolePermissionsLeastPrivilege(t *testing.T) {
	engine := authz.NewAuthorizationEngine(&MockPermissionFinder{}, &MockWorkspaceMemberFinder{})
	ctx := context.Background()

	// Viewer Role
	viewer := &authz.Principal{
		Type:        authz.PrincipalHumanUser,
		ID:          "usr_viewer",
		OrgID:       "org_corp",
		RoleSlug:    "viewer",
		Permissions: []string{"organization:read", "model:read", "logs:read"},
	}

	// Viewer can read models -> ALLOW
	allowed, err := engine.Can(ctx, viewer, "model:read", &authz.ResourceContext{OrgID: "org_corp"})
	require.NoError(t, err)
	assert.True(t, allowed)

	// Viewer CANNOT create API keys -> DENY
	allowed, err = engine.Can(ctx, viewer, "api_key:create", &authz.ResourceContext{OrgID: "org_corp"})
	require.NoError(t, err)
	assert.False(t, allowed, "Viewer must not create API keys")

	// Viewer CANNOT update organization -> DENY
	allowed, err = engine.Can(ctx, viewer, "organization:update", &authz.ResourceContext{OrgID: "org_corp"})
	require.NoError(t, err)
	assert.False(t, allowed, "Viewer must not update organization")

	// Developer Role
	developer := &authz.Principal{
		Type:        authz.PrincipalHumanUser,
		ID:          "usr_developer",
		OrgID:       "org_corp",
		RoleSlug:    "developer",
		Permissions: []string{"api_key:read", "api_key:create", "api_key:revoke", "model:read", "agent:execute"},
	}

	// Developer can create API key -> ALLOW
	allowed, err = engine.Can(ctx, developer, "api_key:create", &authz.ResourceContext{OrgID: "org_corp"})
	require.NoError(t, err)
	assert.True(t, allowed)

	// Developer CANNOT manage billing -> DENY
	allowed, err = engine.Can(ctx, developer, "billing:manage", &authz.ResourceContext{OrgID: "org_corp"})
	require.NoError(t, err)
	assert.False(t, allowed, "Developer must not manage billing")

	// Developer CANNOT remove members -> DENY
	allowed, err = engine.Can(ctx, developer, "member:remove", &authz.ResourceContext{OrgID: "org_corp"})
	require.NoError(t, err)
	assert.False(t, allowed, "Developer must not remove organization members")

	// FinOps Manager Role
	finopsMgr := &authz.Principal{
		Type:        authz.PrincipalHumanUser,
		ID:          "usr_finops",
		OrgID:       "org_corp",
		RoleSlug:    "finops_manager",
		Permissions: []string{"billing:read", "billing:manage", "quota:read", "quota:update", "finops:read"},
	}

	// FinOps manager can manage billing -> ALLOW
	allowed, err = engine.Can(ctx, finopsMgr, "billing:manage", &authz.ResourceContext{OrgID: "org_corp"})
	require.NoError(t, err)
	assert.True(t, allowed)

	// FinOps manager CANNOT execute agent tools -> DENY
	allowed, err = engine.Can(ctx, finopsMgr, "agent:execute", &authz.ResourceContext{OrgID: "org_corp"})
	require.NoError(t, err)
	assert.False(t, allowed, "FinOps manager must not execute agents")
}

// 6. Privilege Escalation Prevention: Non-members & unauthorized actors -> DENY
func TestAuthz_PrivilegeEscalationPrevention(t *testing.T) {
	mockPerms := &MockPermissionFinder{
		Permissions: map[string]map[string][]string{
			"usr_member": {
				"org_corp": {"organization:read", "model:read"},
			},
		},
		Roles: map[string]map[string]string{
			"usr_member": {
				"org_corp": "member",
			},
		},
	}

	engine := authz.NewAuthorizationEngine(mockPerms, &MockWorkspaceMemberFinder{})
	ctx := context.Background()

	member := &authz.Principal{
		Type:  authz.PrincipalHumanUser,
		ID:    "usr_member",
		OrgID: "org_corp",
	}

	// Member attempts to assign owner or manage custom roles -> DENY
	allowed, err := engine.Can(ctx, member, "role:create", &authz.ResourceContext{OrgID: "org_corp"})
	require.NoError(t, err)
	assert.False(t, allowed, "Regular member cannot create custom roles")

	allowed, err = engine.Can(ctx, member, "member:update", &authz.ResourceContext{OrgID: "org_corp"})
	require.NoError(t, err)
	assert.False(t, allowed, "Regular member cannot modify member roles")
}

// 7. Fail-Closed Vector: Database Failure during lookup -> DENY
func TestAuthz_FailClosedOnInfrastructureError(t *testing.T) {
	mockPerms := &MockPermissionFinder{
		SimulateErr: errors.New("connection pool exhausted / database down"),
	}

	engine := authz.NewAuthorizationEngine(mockPerms, &MockWorkspaceMemberFinder{})
	ctx := context.Background()

	caller := &authz.Principal{
		Type:  authz.PrincipalHumanUser,
		ID:    "usr_random",
		OrgID: "org_any",
	}

	// Database failure during authorization lookup MUST fail closed
	allowed, err := engine.Can(ctx, caller, "api_key:read", &authz.ResourceContext{OrgID: "org_any"})
	assert.False(t, allowed, "Lookup failure must strictly fail closed")
	assert.ErrorIs(t, err, authz.ErrForbidden)
}

// 8. Gateway API Key Machine Principal Scoping
func TestAuthz_GatewayAPIKeyScoping(t *testing.T) {
	engine := authz.NewAuthorizationEngine(&MockPermissionFinder{}, &MockWorkspaceMemberFinder{})
	ctx := context.Background()

	gwKey := &authz.Principal{
		Type:          authz.PrincipalGatewayKey,
		ID:            "key_prod_ai",
		OrgID:         "org_enterprise",
		WorkspaceID:   "ws_prod",
		AllowedModels: []string{"gpt-4o", "gemini-2.5-pro"},
		Permissions:   []string{"model:read", "agent:execute"},
	}

	// Key accessing authorized workspace -> ALLOW
	allowed, err := engine.Can(ctx, gwKey, "agent:execute", &authz.ResourceContext{
		OrgID:       "org_enterprise",
		WorkspaceID: "ws_prod",
	})
	require.NoError(t, err)
	assert.True(t, allowed)

	// Key attempting to access unauthorized workspace -> DENY
	allowed, err = engine.Can(ctx, gwKey, "agent:execute", &authz.ResourceContext{
		OrgID:       "org_enterprise",
		WorkspaceID: "ws_staging",
	})
	assert.False(t, allowed)
	assert.ErrorIs(t, err, authz.ErrCrossWorkspaceDenied)
}

// 9. Fail-Closed Tenant Context: Missing Tenant Header or Checker Rejection
func TestTenantMiddleware_MissingTenantHeaderFailClosed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.Use(func(c *gin.Context) {
		c.Set("userId", "usr_123")
		c.Next()
	})
	r.Use(middleware.TenantMiddleware(&mockAccountRepo{}))
	r.GET("/api/test-protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Request sent without X-Prism-Org-ID and without Gateway Key -> MUST FAIL (403)
	req, _ := http.NewRequest("GET", "/api/test-protected", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusForbidden, resp.Code)
	assert.Contains(t, resp.Body.String(), "tenant context required")
}

func TestTenantMiddleware_MissingCheckerFailClosed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.Use(func(c *gin.Context) {
		c.Set("userId", "usr_123")
		c.Next()
	})
	// TenantMiddleware without checker -> MUST FAIL CLOSED if header is supplied
	r.Use(middleware.TenantMiddleware())
	r.GET("/api/test-protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/api/test-protected", nil)
	req.Header.Set("X-Prism-Org-ID", "org_unverified")
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusForbidden, resp.Code)
	assert.Contains(t, resp.Body.String(), "organization membership required")
}
