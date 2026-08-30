package authz

import (
	"context"
	"errors"
	"strings"
)

type PrincipalType string

const (
	PrincipalHumanUser        PrincipalType = "human_user"
	PrincipalServicePrincipal PrincipalType = "service_principal"
	PrincipalAgent            PrincipalType = "agent"
	PrincipalGatewayKey       PrincipalType = "gateway_api_key"
	PrincipalPlatformAdmin    PrincipalType = "platform_admin"
)

var (
	ErrUnauthorized        = errors.New("unauthorized: missing or invalid principal")
	ErrForbidden           = errors.New("forbidden: insufficient permissions for requested action")
	ErrCrossTenantDenied   = errors.New("forbidden: cross-organization access denied")
	ErrCrossWorkspaceDenied = errors.New("forbidden: cross-workspace access denied")
	ErrInvalidAction       = errors.New("invalid action specified for authorization check")
	ErrNotMember           = errors.New("forbidden: user is not a member of target organization")
)

type Principal struct {
	Type            PrincipalType
	ID              string
	Email           string
	OrgID           string
	WorkspaceID     string
	ProjectID       string
	RoleSlug        string
	Permissions     []string
	AllowedModels   []string
	IsPlatformAdmin bool
}

type ResourceContext struct {
	Type        string
	ID          string
	OrgID       string
	WorkspaceID string
	ProjectID   string
	OwnerID     string
}

type PermissionFinder interface {
	GetUserPermissions(ctx context.Context, userID, orgID string) ([]string, string, error)
}

type WorkspaceMemberFinder interface {
	GetWorkspaceMemberRole(ctx context.Context, wsID, userID string) (string, error)
}

type AuthorizationEngine struct {
	permFinder PermissionFinder
	wsFinder   WorkspaceMemberFinder
}

func NewAuthorizationEngine(permFinder PermissionFinder, wsFinder WorkspaceMemberFinder) *AuthorizationEngine {
	return &AuthorizationEngine{
		permFinder: permFinder,
		wsFinder:   wsFinder,
	}
}

// Can evaluates whether the given principal is authorized to perform action on the target resource.
// Evaluation is deterministic and strictly fail-closed.
func (e *AuthorizationEngine) Can(ctx context.Context, p *Principal, action string, target *ResourceContext) (bool, error) {
	if p == nil || p.ID == "" {
		return false, ErrUnauthorized
	}
	if action == "" {
		return false, ErrInvalidAction
	}

	// 1. Platform Admin Isolation: Platform Admins only have platform rights unless scoped
	if p.Type == PrincipalPlatformAdmin {
		if p.IsPlatformAdmin && (target == nil || target.OrgID == "") {
			return true, nil
		}
	}

	// 2. Organization Boundary Check (Zero Cross-Tenant Access)
	if target != nil && target.OrgID != "" {
		if p.OrgID == "" {
			return false, ErrCrossTenantDenied
		}
		if p.OrgID != target.OrgID {
			return false, ErrCrossTenantDenied
		}
	}

	// 3. Workspace Boundary Check
	if target != nil && target.WorkspaceID != "" && p.WorkspaceID != "" {
		if p.WorkspaceID != target.WorkspaceID {
			return false, ErrCrossWorkspaceDenied
		}
	}

	// 4. Resolve permissions if not pre-populated
	perms := p.Permissions
	if len(perms) == 0 && e.permFinder != nil && p.OrgID != "" && p.Type == PrincipalHumanUser {
		fetchedPerms, roleSlug, err := e.permFinder.GetUserPermissions(ctx, p.ID, p.OrgID)
		if err != nil {
			// Fail-closed on error!
			return false, ErrForbidden
		}
		perms = fetchedPerms
		p.RoleSlug = roleSlug
		p.Permissions = fetchedPerms
	}

	// 5. Evaluate Permission Rules
	return evaluatePermissionMatch(perms, action), nil
}

// evaluatePermissionMatch matches permission codes supporting exact match, wildcard '*', and prefix wildcards 'resource:*'.
func evaluatePermissionMatch(perms []string, targetAction string) bool {
	if len(perms) == 0 {
		return false
	}

	targetAction = strings.ToLower(strings.TrimSpace(targetAction))
	parts := strings.SplitN(targetAction, ":", 2)
	resourcePrefix := ""
	if len(parts) == 2 {
		resourcePrefix = parts[0] + ":*"
	}

	for _, perm := range perms {
		perm = strings.ToLower(strings.TrimSpace(perm))
		if perm == "*" || perm == "all" {
			return true
		}
		if perm == targetAction {
			return true
		}
		if resourcePrefix != "" && (perm == resourcePrefix || perm == parts[0]+":write" && parts[1] == "update") {
			return true
		}
	}

	return false
}

// Authorize is a convenience helper that returns ErrForbidden if Can returns false.
func (e *AuthorizationEngine) Authorize(ctx context.Context, p *Principal, action string, target *ResourceContext) error {
	allowed, err := e.Can(ctx, p, action, target)
	if err != nil {
		return err
	}
	if !allowed {
		return ErrForbidden
	}
	return nil
}
