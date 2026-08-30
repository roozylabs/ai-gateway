package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/roozylabs/prism/internal/models"
)

var (
	ErrNotMember               = errors.New("user is not a member of the organization")
	ErrCannotRemoveLastOwner   = errors.New("cannot remove the last owner of an organization")
	ErrCannotDemoteLastOwner   = errors.New("cannot demote the last owner of an organization")
	ErrInvalidRole             = errors.New("invalid role specified")
)

type RBACRepository struct {
	db *sql.DB
}

func NewRBACRepository(db *sql.DB) *RBACRepository {
	return &RBACRepository{db: db}
}

// GetUserPermissions queries the authoritative role and permissions for a user in the specified organization.
// Returns strictly fail-closed error if query fails or membership record is absent.
func (r *RBACRepository) GetUserPermissions(ctx context.Context, userID string, orgID string) ([]string, string, error) {
	if userID == "" || orgID == "" {
		return nil, "", ErrNotMember
	}

	// 1. Query role and permissions joined through roles and role_permissions
	query := `
		SELECT COALESCE(r.slug, om.role), COALESCE(p.code, '')
		FROM organization_members om
		LEFT JOIN roles r ON (om.role_id = r.id OR om.role = r.slug)
		LEFT JOIN role_permissions rp ON r.id = rp.role_id
		LEFT JOIN permissions p ON rp.permission_id = p.id
		WHERE om.user_id = $1 AND om.org_id = $2
	`
	rows, err := r.db.QueryContext(ctx, query, userID, orgID)
	if err != nil {
		return nil, "", fmt.Errorf("query user permissions: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var roleSlug string
	var permissions []string
	foundMember := false

	for rows.Next() {
		foundMember = true
		var rSlug, pCode string
		if err := rows.Scan(&rSlug, &pCode); err == nil {
			if roleSlug == "" && rSlug != "" {
				roleSlug = rSlug
			}
			if pCode != "" {
				permissions = append(permissions, pCode)
			}
		}
	}
	if err := rows.Err(); err != nil {
		return nil, "", fmt.Errorf("scan user permissions: %w", err)
	}

	if !foundMember {
		return nil, "", ErrNotMember
	}

	// Owner role inherently retains wildcard access
	if roleSlug == "owner" {
		hasWildcard := false
		for _, p := range permissions {
			if p == "*" {
				hasWildcard = true
				break
			}
		}
		if !hasWildcard {
			permissions = append(permissions, "*")
		}
	}

	return permissions, roleSlug, nil
}

// CountOwners returns the number of active owners for an organization.
func (r *RBACRepository) CountOwners(ctx context.Context, orgID string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM organization_members WHERE org_id = $1 AND role = 'owner'`,
		orgID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count owners: %w", err)
	}
	return count, nil
}

// ListOrganizationMembers returns all members for an organization.
func (r *RBACRepository) ListOrganizationMembers(ctx context.Context, orgID string) ([]models.OrganizationMember, error) {
	query := `
		SELECT om.id, om.org_id, om.user_id, COALESCE(u.email, ''), COALESCE(u.name, ''), om.role, om.created_at, om.updated_at
		FROM organization_members om
		LEFT JOIN "user" u ON om.user_id = u.id
		WHERE om.org_id = $1
		ORDER BY om.created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("list organization members: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var members []models.OrganizationMember
	for rows.Next() {
		var m models.OrganizationMember
		if err := rows.Scan(&m.ID, &m.OrgID, &m.UserID, &m.UserEmail, &m.UserName, &m.Role, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, rows.Err()
}

// AddOrganizationMember adds a user to an organization.
func (r *RBACRepository) AddOrganizationMember(ctx context.Context, orgID, userID, role string) error {
	now := time.Now()
	id := uuid.New().String()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO organization_members (id, org_id, user_id, role, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = EXCLUDED.updated_at`,
		id, orgID, userID, role, now, now,
	)
	return err
}

// UpdateMemberRole updates a member's role with Last-Owner invariant safety.
func (r *RBACRepository) UpdateMemberRole(ctx context.Context, orgID, userID, newRole string) error {
	var currentRole string
	err := r.db.QueryRowContext(ctx,
		`SELECT role FROM organization_members WHERE org_id = $1 AND user_id = $2`,
		orgID, userID,
	).Scan(&currentRole)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotMember
		}
		return err
	}

	if currentRole == "owner" && newRole != "owner" {
		ownerCount, err := r.CountOwners(ctx, orgID)
		if err != nil {
			return err
		}
		if ownerCount <= 1 {
			return ErrCannotDemoteLastOwner
		}
	}

	_, err = r.db.ExecContext(ctx,
		`UPDATE organization_members SET role = $1, updated_at = $2 WHERE org_id = $3 AND user_id = $4`,
		newRole, time.Now(), orgID, userID,
	)
	return err
}

// RemoveOrganizationMember removes a member from an organization with Last-Owner invariant safety.
func (r *RBACRepository) RemoveOrganizationMember(ctx context.Context, orgID, userID string) error {
	var currentRole string
	err := r.db.QueryRowContext(ctx,
		`SELECT role FROM organization_members WHERE org_id = $1 AND user_id = $2`,
		orgID, userID,
	).Scan(&currentRole)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotMember
		}
		return err
	}

	if currentRole == "owner" {
		ownerCount, err := r.CountOwners(ctx, orgID)
		if err != nil {
			return err
		}
		if ownerCount <= 1 {
			return ErrCannotRemoveLastOwner
		}
	}

	_, err = r.db.ExecContext(ctx,
		`DELETE FROM organization_members WHERE org_id = $1 AND user_id = $2`,
		orgID, userID,
	)
	return err
}

// GetWorkspaceMemberRole returns the role of a user in a workspace.
func (r *RBACRepository) GetWorkspaceMemberRole(ctx context.Context, wsID, userID string) (string, error) {
	var role string
	err := r.db.QueryRowContext(ctx,
		`SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
		wsID, userID,
	).Scan(&role)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrNotMember
		}
		return "", err
	}
	return role, nil
}

// ListWorkspaceMembers returns all members for a workspace.
func (r *RBACRepository) ListWorkspaceMembers(ctx context.Context, wsID string) ([]models.WorkspaceMember, error) {
	query := `
		SELECT wm.id, wm.workspace_id, wm.user_id, COALESCE(u.email, ''), COALESCE(u.name, ''), wm.role, wm.created_at, wm.updated_at
		FROM workspace_members wm
		LEFT JOIN "user" u ON wm.user_id = u.id
		WHERE wm.workspace_id = $1
		ORDER BY wm.created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, wsID)
	if err != nil {
		return nil, fmt.Errorf("list workspace members: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var members []models.WorkspaceMember
	for rows.Next() {
		var m models.WorkspaceMember
		if err := rows.Scan(&m.ID, &m.WorkspaceID, &m.UserID, &m.UserEmail, &m.UserName, &m.Role, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, rows.Err()
}

// AddWorkspaceMember adds a user to a workspace.
func (r *RBACRepository) AddWorkspaceMember(ctx context.Context, wsID, userID, role string) error {
	now := time.Now()
	id := uuid.New().String()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = EXCLUDED.updated_at`,
		id, wsID, userID, role, now, now,
	)
	return err
}

// RemoveWorkspaceMember removes a member from a workspace.
func (r *RBACRepository) RemoveWorkspaceMember(ctx context.Context, wsID, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
		wsID, userID,
	)
	return err
}

func (r *RBACRepository) ListRoles(ctx context.Context, orgID string) ([]models.Role, error) {
	query := `
		SELECT id, organization_id, name, slug, description, is_system, created_at, updated_at
		FROM roles
		WHERE is_system = true OR organization_id = $1
		ORDER BY is_system DESC, name ASC
	`
	rows, err := r.db.QueryContext(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("list roles: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var roles []models.Role
	for rows.Next() {
		var role models.Role
		if err := rows.Scan(
			&role.ID, &role.OrganizationID, &role.Name, &role.Slug,
			&role.Description, &role.IsSystem, &role.CreatedAt, &role.UpdatedAt,
		); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("scan roles row error: %w", err)
	}
	return roles, nil
}

func (r *RBACRepository) CreateCustomRole(ctx context.Context, role *models.Role, permCodes []string) error {
	if role.ID == "" {
		role.ID = uuid.New().String()
	}
	now := time.Now()
	role.CreatedAt = now
	role.UpdatedAt = now

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	queryRole := `
		INSERT INTO roles (id, organization_id, name, slug, description, is_system, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, false, $6, $7)
	`
	if _, err := tx.ExecContext(ctx, queryRole, role.ID, role.OrganizationID, role.Name, role.Slug, role.Description, role.CreatedAt, role.UpdatedAt); err != nil {
		return fmt.Errorf("create role: %w", err)
	}

	if len(permCodes) > 0 {
		queryPerm := `
			INSERT INTO role_permissions (role_id, permission_id)
			SELECT $1, id FROM permissions WHERE code = ANY($2)
		`
		if _, err := tx.ExecContext(ctx, queryPerm, role.ID, permCodes); err != nil {
			return fmt.Errorf("link role permissions: %w", err)
		}
	}

	return tx.Commit()
}

func (r *RBACRepository) CreateInvite(ctx context.Context, invite *models.MemberInvite) error {
	if invite.ID == "" {
		invite.ID = uuid.New().String()
	}
	if invite.Token == "" {
		invite.Token = uuid.New().String()
	}
	now := time.Now()
	invite.CreatedAt = now
	if invite.ExpiresAt.IsZero() {
		invite.ExpiresAt = now.Add(7 * 24 * time.Hour) // 7 days
	}
	invite.Status = "pending"

	query := `
		INSERT INTO member_invites (id, organization_id, role_id, email, token, status, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.ExecContext(ctx, query, invite.ID, invite.OrganizationID, invite.RoleID, invite.Email, invite.Token, invite.Status, invite.ExpiresAt, invite.CreatedAt)
	if err != nil {
		return fmt.Errorf("create member invite: %w", err)
	}
	return nil
}

func (r *RBACRepository) GetInviteByToken(ctx context.Context, token string) (*models.MemberInvite, error) {
	query := `
		SELECT id, organization_id, role_id, email, token, status, expires_at, created_at
		FROM member_invites
		WHERE token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
	`
	row := r.db.QueryRowContext(ctx, query, token)
	var inv models.MemberInvite
	err := row.Scan(&inv.ID, &inv.OrganizationID, &inv.RoleID, &inv.Email, &inv.Token, &inv.Status, &inv.ExpiresAt, &inv.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get invite by token: %w", err)
	}
	return &inv, nil
}

func (r *RBACRepository) ListUserOrganizations(ctx context.Context, userID string) ([]models.Organization, error) {
	query := `
		SELECT o.id, o.name, o.slug, o.plan_tier, o.max_workspaces, o.max_projects_per_workspace, o.created_at, o.updated_at
		FROM organizations o
		JOIN organization_members om ON om.org_id = o.id
		WHERE om.user_id = $1
		GROUP BY o.id, o.name, o.slug, o.plan_tier, o.max_workspaces, o.max_projects_per_workspace, o.created_at, o.updated_at
		ORDER BY o.name ASC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var orgs []models.Organization
	for rows.Next() {
		var o models.Organization
		if err := rows.Scan(&o.ID, &o.Name, &o.Slug, &o.PlanTier, &o.MaxWorkspaces, &o.MaxProjectsPerWorkspace, &o.CreatedAt, &o.UpdatedAt); err == nil {
			orgs = append(orgs, o)
		}
	}
	return orgs, rows.Err()
}
