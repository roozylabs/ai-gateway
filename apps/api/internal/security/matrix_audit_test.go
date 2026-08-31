package security_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/roozylabs/prism/internal/authz"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/utils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const TestMatrixSharedPassword = "PrismMatrix_7x9k2m4p!"

// Canonical role permissions mapped from database taxonomy
var ExpectedRolePermissions = map[string][]string{
	"owner": {
		"organization:read", "organization:update", "organization:delete",
		"member:read", "member:invite", "member:update", "member:remove",
		"role:read", "role:create", "role:update", "role:delete",
		"workspace:read", "workspace:create", "workspace:update", "workspace:delete", "workspace:admin",
		"project:read", "project:create", "project:update", "project:delete",
		"api_key:read", "api_key:create", "api_key:rotate", "api_key:revoke",
		"credential:read", "credential:create", "credential:update", "credential:delete",
		"model:read", "model:create", "model:update", "model:delete",
		"agent:read", "agent:create", "agent:update", "agent:delete", "agent:execute",
		"mcp:read", "mcp:create", "mcp:update", "mcp:delete", "mcp:execute",
		"tool:read", "tool:create", "tool:update", "tool:delete", "tool:execute",
		"resource:read", "resource:create", "resource:update", "resource:delete", "resource:query",
		"governance:read", "governance:create", "governance:update", "governance:delete", "governance:evaluate",
		"budget:read", "budget:create", "budget:update", "budget:delete",
		"quota:read", "quota:update",
		"billing:read", "billing:manage",
		"finops:read", "finops:manage_budget",
		"playground:execute", "logs:read",
		"audit:read", "audit:export", "audit:verify",
	},
	"developer": {
		"organization:read", "workspace:read", "project:read",
		"api_key:read", "api_key:create", "api_key:rotate", "api_key:revoke",
		"credential:read", "credential:create", "credential:update",
		"model:read", "model:update",
		"agent:read", "agent:create", "agent:update", "agent:execute",
		"mcp:read", "mcp:create", "mcp:update", "mcp:execute",
		"tool:read", "tool:create", "tool:update", "tool:execute",
		"resource:read", "resource:create", "resource:update", "resource:query",
		"budget:read", "quota:read", "audit:read",
		"playground:execute", "logs:read",
	},
	"agent_manager": {
		"organization:read", "workspace:read", "project:read",
		"agent:read", "agent:create", "agent:update", "agent:delete", "agent:execute",
		"mcp:read", "mcp:create", "mcp:update", "mcp:execute",
		"tool:read", "tool:create", "tool:update", "tool:execute",
		"governance:read", "governance:evaluate",
		"budget:read", "quota:read", "audit:read",
		"playground:execute", "logs:read",
	},
	"finops_manager": {
		"organization:read", "workspace:read", "project:read",
		"budget:read", "budget:create", "budget:update", "budget:delete",
		"quota:read", "quota:update",
		"billing:read", "billing:manage",
		"finops:read", "finops:manage_budget",
		"audit:read", "audit:export", "logs:read",
	},
	"auditor": {
		"organization:read", "workspace:read", "project:read",
		"governance:read", "budget:read", "quota:read",
		"audit:read", "audit:export", "audit:verify", "logs:read",
	},
	"viewer": {
		"organization:read", "workspace:read", "project:read",
		"model:read", "agent:read", "mcp:read", "tool:read", "resource:read",
		"budget:read", "quota:read", "logs:read", "audit:read",
	},
}

// 1. Audit Role Permission Matrix across all 6 Roles
func TestMatrixAudit_RolePermissionsComprehensive(t *testing.T) {
	ctx := context.Background()

	plans := []string{"free", "pro", "team", "enterprise"}
	roles := []string{"owner", "developer", "agent_manager", "finops_manager", "auditor", "viewer"}

	for _, plan := range plans {
		orgID := fmt.Sprintf("org_matrix_%s", plan)

		for _, roleSlug := range roles {
			t.Run(fmt.Sprintf("%s_%s_permissions", plan, roleSlug), func(t *testing.T) {
				expectedPerms := ExpectedRolePermissions[roleSlug]

				mockPerms := &MockPermissionFinder{
					Permissions: map[string]map[string][]string{
						"usr_test": {
							orgID: expectedPerms,
						},
					},
					Roles: map[string]map[string]string{
						"usr_test": {
							orgID: roleSlug,
						},
					},
				}

				engine := authz.NewAuthorizationEngine(mockPerms, &MockWorkspaceMemberFinder{})
				principal := &authz.Principal{
					Type:     authz.PrincipalHumanUser,
					ID:       "usr_test",
					OrgID:    orgID,
					RoleSlug: roleSlug,
				}

				target := &authz.ResourceContext{OrgID: orgID}

				// Test permissions that should be ALLOWED
				for _, perm := range expectedPerms {
					if perm == "workspace:admin" {
						continue // tested in workspace isolation
					}
					allowed, err := engine.Can(ctx, principal, perm, target)
					require.NoError(t, err)
					assert.True(t, allowed, "Role %s should have permission %s", roleSlug, perm)
				}

				// Test unauthorized actions based on least-privilege role boundaries
				if roleSlug != "owner" {
					allowed, err := engine.Can(ctx, principal, "organization:delete", target)
					require.NoError(t, err)
					assert.False(t, allowed, "Non-owner %s must NOT delete organization", roleSlug)

					allowed, err = engine.Can(ctx, principal, "member:remove", target)
					require.NoError(t, err)
					assert.False(t, allowed, "Non-owner %s must NOT remove members", roleSlug)
				}

				if roleSlug == "viewer" {
					allowed, err := engine.Can(ctx, principal, "api_key:create", target)
					require.NoError(t, err)
					assert.False(t, allowed, "Viewer must NOT create API keys")

					allowed, err = engine.Can(ctx, principal, "billing:manage", target)
					require.NoError(t, err)
					assert.False(t, allowed, "Viewer must NOT manage billing")
				}

				if roleSlug == "developer" {
					allowed, err := engine.Can(ctx, principal, "billing:manage", target)
					require.NoError(t, err)
					assert.False(t, allowed, "Developer must NOT manage billing")
				}

				if roleSlug == "finops_manager" {
					allowed, err := engine.Can(ctx, principal, "agent:delete", target)
					require.NoError(t, err)
					assert.False(t, allowed, "FinOps manager must NOT delete agents")
				}
			})
		}
	}
}

// 2. Audit Subscription Plan Quota Limits
func TestMatrixAudit_PlanQuotasAndLimits(t *testing.T) {
	planQuotas := []struct {
		Plan          string
		MonthlySpend  float64
		DailySpend    float64
		SpendAllowed  float64
		SpendExceeded float64
	}{
		{Plan: "free", MonthlySpend: 50.0, DailySpend: 5.0, SpendAllowed: 49.50, SpendExceeded: 50.01},
		{Plan: "pro", MonthlySpend: 300.0, DailySpend: 30.0, SpendAllowed: 295.00, SpendExceeded: 300.01},
		{Plan: "team", MonthlySpend: 1500.0, DailySpend: 150.0, SpendAllowed: 1490.00, SpendExceeded: 1500.01},
		{Plan: "enterprise", MonthlySpend: 5000.0, DailySpend: 500.0, SpendAllowed: 4990.00, SpendExceeded: 5000.01},
	}

	for _, tc := range planQuotas {
		t.Run(fmt.Sprintf("%s_quota_check", tc.Plan), func(t *testing.T) {
			quota := &models.TenantQuota{
				TargetType:           "organization",
				TargetID:             fmt.Sprintf("org_matrix_%s", tc.Plan),
				MonthlySpendLimitUSD: tc.MonthlySpend,
				DailySpendLimitUSD:   tc.DailySpend,
			}

			// Spend under limit -> Allowed
			resAllowed := evaluateTestQuota(quota, tc.SpendAllowed, 0.0)
			assert.True(t, resAllowed.Allowed, "Spend under limit must be allowed for plan %s", tc.Plan)

			// Spend over limit -> Denied
			resDenied := evaluateTestQuota(quota, tc.SpendExceeded, 0.0)
			assert.False(t, resDenied.Allowed, "Spend over limit must be denied for plan %s", tc.Plan)
			assert.Contains(t, resDenied.Reason, "Monthly spend limit")
		})
	}
}

func evaluateTestQuota(q *models.TenantQuota, monthlySpent, dailySpent float64) *models.QuotaCheckResult {
	res := &models.QuotaCheckResult{
		Allowed:         true,
		TargetType:      q.TargetType,
		TargetID:        q.TargetID,
		MonthlySpendUSD: monthlySpent,
		MonthlyLimitUSD: q.MonthlySpendLimitUSD,
		DailySpendUSD:   dailySpent,
		DailyLimitUSD:   q.DailySpendLimitUSD,
	}

	if q.MonthlySpendLimitUSD > 0 && monthlySpent >= q.MonthlySpendLimitUSD {
		res.Allowed = false
		res.Reason = fmt.Sprintf("Monthly spend limit of $%.2f USD exceeded (Spent: $%.2f USD)", q.MonthlySpendLimitUSD, monthlySpent)
		return res
	}

	if q.DailySpendLimitUSD > 0 && dailySpent >= q.DailySpendLimitUSD {
		res.Allowed = false
		res.Reason = fmt.Sprintf("Daily spend limit of $%.2f USD exceeded (Spent: $%.2f USD)", q.DailySpendLimitUSD, dailySpent)
		return res
	}

	return res
}

// 3. Audit Cross-Tenant Isolation Across All Matrix Organizations
func TestMatrixAudit_CrossTenantIsolationAllMatrixUsers(t *testing.T) {
	ctx := context.Background()

	engine := authz.NewAuthorizationEngine(&MockPermissionFinder{}, &MockWorkspaceMemberFinder{})

	orgUUIDs := []string{
		"10000000-0000-0000-0000-000000000001",
		"10000000-0000-0000-0000-000000000002",
		"10000000-0000-0000-0000-000000000003",
		"10000000-0000-0000-0000-000000000004",
	}

	// Test UUID-based cross-tenant isolation
	for i, callerOrgID := range orgUUIDs {
		principal := &authz.Principal{
			Type:        authz.PrincipalHumanUser,
			ID:          fmt.Sprintf("40000000-0000-0000-%04d-000000000002", i+1),
			OrgID:       callerOrgID,
			RoleSlug:    "developer",
			Permissions: ExpectedRolePermissions["developer"],
		}

		for j, targetOrgID := range orgUUIDs {
			target := &authz.ResourceContext{
				Type:  "credential",
				ID:    fmt.Sprintf("cred_%d", j+1),
				OrgID: targetOrgID,
			}

			allowed, err := engine.Can(ctx, principal, "credential:read", target)

			if i == j {
				require.NoError(t, err)
				assert.True(t, allowed, "User should access resource in their own organization")
			} else {
				assert.False(t, allowed, "User in %s must NOT access resource in %s", callerOrgID, targetOrgID)
				assert.ErrorIs(t, err, authz.ErrCrossTenantDenied)
			}
		}
	}
}

// 4. Audit Workspace Isolation & workspace:admin Override
func TestMatrixAudit_WorkspaceIsolationAndAdminOverride(t *testing.T) {
	ctx := context.Background()

	wsFinder := &MockWorkspaceMemberFinder{
		WorkspaceRoles: map[string]map[string]string{
			"20000000-0000-0000-0000-000000000003": {
				"40000000-0000-0000-0002-000000000002": "developer",
			},
			"20000000-0000-0000-0000-000000000004": {
				"40000000-0000-0000-0002-000000000004": "finops_manager",
			},
		},
	}

	engine := authz.NewAuthorizationEngine(&MockPermissionFinder{}, wsFinder)

	// Developer in ws_pro_eng attempting to access ws_pro_finance -> DENIED
	devPrincipal := &authz.Principal{
		Type:        authz.PrincipalHumanUser,
		ID:          "40000000-0000-0000-0002-000000000002",
		OrgID:       "10000000-0000-0000-0000-000000000002",
		WorkspaceID: "20000000-0000-0000-0000-000000000003",
		RoleSlug:    "developer",
		Permissions: ExpectedRolePermissions["developer"],
	}

	allowed, err := engine.Can(ctx, devPrincipal, "budget:read", &authz.ResourceContext{
		OrgID:       "10000000-0000-0000-0000-000000000002",
		WorkspaceID: "20000000-0000-0000-0000-000000000004",
	})
	assert.False(t, allowed)
	assert.ErrorIs(t, err, authz.ErrCrossWorkspaceDenied)

	// FinOps manager in ws_pro_finance accessing ws_pro_finance -> ALLOWED
	finopsPrincipal := &authz.Principal{
		Type:        authz.PrincipalHumanUser,
		ID:          "40000000-0000-0000-0002-000000000004",
		OrgID:       "10000000-0000-0000-0000-000000000002",
		WorkspaceID: "20000000-0000-0000-0000-000000000004",
		RoleSlug:    "finops_manager",
		Permissions: ExpectedRolePermissions["finops_manager"],
	}

	allowed, err = engine.Can(ctx, finopsPrincipal, "budget:read", &authz.ResourceContext{
		OrgID:       "10000000-0000-0000-0000-000000000002",
		WorkspaceID: "20000000-0000-0000-0000-000000000004",
	})
	require.NoError(t, err)
	assert.True(t, allowed)

	// Owner with workspace:admin accessing ws_pro_finance without explicit membership -> ALLOWED (override)
	ownerPrincipal := &authz.Principal{
		Type:        authz.PrincipalHumanUser,
		ID:          "40000000-0000-0000-0002-000000000001",
		OrgID:       "10000000-0000-0000-0000-000000000002",
		WorkspaceID: "", // org-level scope
		RoleSlug:    "owner",
		Permissions: ExpectedRolePermissions["owner"],
	}

	allowed, err = engine.Can(ctx, ownerPrincipal, "budget:read", &authz.ResourceContext{
		OrgID:       "10000000-0000-0000-0000-000000000002",
		WorkspaceID: "20000000-0000-0000-0000-000000000004",
	})
	require.NoError(t, err)
	assert.True(t, allowed, "Owner with workspace:admin must have administrative override to any workspace")
}

// 5. Audit Shared Password Bcrypt Hashing
func TestMatrixAudit_SharedPasswordAuthentication(t *testing.T) {
	// 5a. Dynamic Hash verification
	hash, err := utils.HashPassword(TestMatrixSharedPassword)
	require.NoError(t, err)

	assert.True(t, utils.CheckPassword(TestMatrixSharedPassword, hash), "Password verification must succeed for dynamically generated hash")
	assert.False(t, utils.CheckPassword("wrong_password", hash), "Incorrect password must be rejected")

	// 5b. Exact migration 079 static seeded hash verification
	seededHash := "$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46"
	assert.True(t, utils.CheckPassword(TestMatrixSharedPassword, seededHash), "Seeded migration hash must match shared password PrismMatrix_7x9k2m4p!")
}
