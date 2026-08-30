package security_test

import (
	"context"
	"errors"
	"testing"

	"github.com/roozylabs/prism/internal/authz"
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
}

func (m *MockWorkspaceMemberFinder) GetWorkspaceMemberRole(ctx context.Context, wsID, userID string) (string, error) {
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
		Permissions: []string{"*"},
	}

	// Access resource in same Org A -> ALLOW
	allowed, err := engine.Can(ctx, principalOrgA, "agent:read", &authz.ResourceContext{
		Type:  "agent",
		ID:    "agent_1",
		OrgID: "org_alpha",
	})
	require.NoError(t, err)
	assert.True(t, allowed, "Owner must access own organization resource")

	// Attempt access resource in Org B -> DENY
	allowed, err = engine.Can(ctx, principalOrgA, "agent:read", &authz.ResourceContext{
		Type:  "agent",
		ID:    "agent_2",
		OrgID: "org_beta",
	})
	assert.False(t, allowed, "Cross-tenant access must be denied")
	assert.ErrorIs(t, err, authz.ErrCrossTenantDenied)
}

// 3. Workspace Boundary Vector: Cross-Workspace Access -> DENY
func TestAuthz_WorkspaceIsolation(t *testing.T) {
	engine := authz.NewAuthorizationEngine(&MockPermissionFinder{}, &MockWorkspaceMemberFinder{})
	ctx := context.Background()

	principalWsA := &authz.Principal{
		Type:        authz.PrincipalHumanUser,
		ID:          "usr_dev",
		OrgID:       "org_corp",
		WorkspaceID: "ws_eng",
		RoleSlug:    "developer",
		Permissions: []string{"agent:read", "agent:execute"},
	}

	// Access resource in same workspace -> ALLOW
	allowed, err := engine.Can(ctx, principalWsA, "agent:read", &authz.ResourceContext{
		Type:        "agent",
		OrgID:       "org_corp",
		WorkspaceID: "ws_eng",
	})
	require.NoError(t, err)
	assert.True(t, allowed)

	// Attempt access resource in different workspace -> DENY
	allowed, err = engine.Can(ctx, principalWsA, "agent:read", &authz.ResourceContext{
		Type:        "agent",
		OrgID:       "org_corp",
		WorkspaceID: "ws_finance",
	})
	assert.False(t, allowed, "Cross-workspace access must be strictly denied")
	assert.ErrorIs(t, err, authz.ErrCrossWorkspaceDenied)
}

// 4. Role Permissions Vector: Least-Privilege Role Enforcement
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

	// Billing Manager Role
	billingMgr := &authz.Principal{
		Type:        authz.PrincipalHumanUser,
		ID:          "usr_billing",
		OrgID:       "org_corp",
		RoleSlug:    "billing_manager",
		Permissions: []string{"billing:read", "billing:manage", "quota:read", "quota:update"},
	}

	// Billing manager can manage billing -> ALLOW
	allowed, err = engine.Can(ctx, billingMgr, "billing:manage", &authz.ResourceContext{OrgID: "org_corp"})
	require.NoError(t, err)
	assert.True(t, allowed)

	// Billing manager CANNOT execute agent tools -> DENY
	allowed, err = engine.Can(ctx, billingMgr, "agent:execute", &authz.ResourceContext{OrgID: "org_corp"})
	require.NoError(t, err)
	assert.False(t, allowed, "Billing manager must not execute agents")
}

// 5. Privilege Escalation Prevention Vector: Non-members & unauthorized actors -> DENY
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

// 6. Fail-Closed Vector: Database Failure or Unassigned Role -> DENY
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

// 7. Gateway API Key Machine Principal Scoping
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
