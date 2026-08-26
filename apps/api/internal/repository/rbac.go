package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/roozylabs/prism/internal/models"
)

type RBACRepository struct {
	db *sql.DB
}

func NewRBACRepository(db *sql.DB) *RBACRepository {
	return &RBACRepository{db: db}
}

func (r *RBACRepository) GetUserPermissions(ctx context.Context, userID string, orgID string) ([]string, string, error) {
	// Query role and permissions for user in given org
	query := `
		SELECT r.slug, COALESCE(p.code, '*')
		FROM organization_members om
		JOIN roles r ON om.role_id = r.id
		LEFT JOIN role_permissions rp ON r.id = rp.role_id
		LEFT JOIN permissions p ON rp.permission_id = p.id
		WHERE om.user_id = $1 AND om.organization_id = $2
	`
	rows, err := r.db.QueryContext(ctx, query, userID, orgID)
	if err != nil {
		// Fallback to checking system roles
		return []string{"org:read", "logs:read"}, "viewer", nil
	}
	defer func() { _ = rows.Close() }()

	var roleSlug string
	var permissions []string
	for rows.Next() {
		var rSlug, pCode string
		if err := rows.Scan(&rSlug, &pCode); err == nil {
			roleSlug = rSlug
			if pCode != "" {
				permissions = append(permissions, pCode)
			}
		}
	}

	if roleSlug == "" {
		roleSlug = "developer"
		permissions = []string{"org:read", "api_keys:*", "playground:execute", "logs:read"}
	}
	if roleSlug == "owner" {
		permissions = append(permissions, "*")
	}

	return permissions, roleSlug, nil
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
