package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/roozylabs/prism/internal/models"
)

type ResourceRepository struct {
	db *sql.DB
}

func NewResourceRepository(db *sql.DB) *ResourceRepository {
	return &ResourceRepository{db: db}
}

const resourceColumns = `id, COALESCE(org_id, ''), COALESCE(workspace_id, ''), user_id, name, display_name, description, parameters_schema, enabled, created_at, updated_at`

func (r *ResourceRepository) ListByOrgID(ctx context.Context, orgID, workspaceID string) ([]models.Resource, error) {
	query := `SELECT ` + resourceColumns + ` FROM resources`
	var conditions []string
	var args []interface{}

	if orgID != "" {
		conditions = append(conditions, fmt.Sprintf("org_id = $%d", len(args)+1))
		args = append(args, orgID)
	}

	if workspaceID != "" {
		conditions = append(conditions, fmt.Sprintf("(workspace_id = $%d OR workspace_id IS NULL OR workspace_id = '')", len(args)+1))
		args = append(args, workspaceID)
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += ` ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var resources []models.Resource
	for rows.Next() {
		var res models.Resource
		if err := rows.Scan(
			&res.ID, &res.OrgID, &res.WorkspaceID, &res.UserID,
			&res.Name, &res.DisplayName, &res.Description,
			&res.ParametersSchema, &res.Enabled,
			&res.CreatedAt, &res.UpdatedAt,
		); err != nil {
			return nil, err
		}
		resources = append(resources, res)
	}
	return resources, rows.Err()
}

func (r *ResourceRepository) ListByUserID(ctx context.Context, userID string) ([]models.Resource, error) {
	query := `SELECT ` + resourceColumns + ` FROM resources`
	var args []interface{}
	if userID != "" {
		query += ` WHERE user_id = $1`
		args = append(args, userID)
	}
	query += ` ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var resources []models.Resource
	for rows.Next() {
		var res models.Resource
		if err := rows.Scan(
			&res.ID, &res.OrgID, &res.WorkspaceID, &res.UserID,
			&res.Name, &res.DisplayName, &res.Description,
			&res.ParametersSchema, &res.Enabled,
			&res.CreatedAt, &res.UpdatedAt,
		); err != nil {
			return nil, err
		}
		resources = append(resources, res)
	}
	return resources, rows.Err()
}

func (r *ResourceRepository) FindByID(ctx context.Context, id, orgID string) (*models.Resource, error) {
	var res models.Resource
	query := `SELECT ` + resourceColumns + ` FROM resources WHERE id = $1`
	args := []interface{}{id}
	if orgID != "" {
		query += ` AND (org_id = $2 OR user_id = $2)`
		args = append(args, orgID)
	}

	err := r.db.QueryRowContext(ctx, query, args...).Scan(
		&res.ID, &res.OrgID, &res.WorkspaceID, &res.UserID,
		&res.Name, &res.DisplayName, &res.Description,
		&res.ParametersSchema, &res.Enabled,
		&res.CreatedAt, &res.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func (r *ResourceRepository) FindByOrgAndName(ctx context.Context, orgID, name string) (*models.Resource, error) {
	var res models.Resource
	query := `SELECT ` + resourceColumns + ` FROM resources WHERE name = $1`
	args := []interface{}{name}
	if orgID != "" {
		query += ` AND (org_id = $2 OR user_id = $2)`
		args = append(args, orgID)
	}
	query += ` LIMIT 1`

	err := r.db.QueryRowContext(ctx, query, args...).Scan(
		&res.ID, &res.OrgID, &res.WorkspaceID, &res.UserID,
		&res.Name, &res.DisplayName, &res.Description,
		&res.ParametersSchema, &res.Enabled,
		&res.CreatedAt, &res.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func (r *ResourceRepository) FindByUserAndName(ctx context.Context, userID, name string) (*models.Resource, error) {
	return r.FindByOrgAndName(ctx, userID, name)
}

func (r *ResourceRepository) Create(ctx context.Context, res *models.Resource) error {
	if res.ID == "" {
		res.ID = uuid.New().String()
	}
	now := time.Now()
	res.CreatedAt = now
	res.UpdatedAt = now
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO resources (id, org_id, workspace_id, user_id, name, display_name, description, parameters_schema, enabled, created_at, updated_at)
		 VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4, $5, $6, $7, $8, $9, $10, $11)`,
		res.ID, res.OrgID, res.WorkspaceID, res.UserID, res.Name, res.DisplayName, res.Description, []byte(res.ParametersSchema), res.Enabled, res.CreatedAt, res.UpdatedAt)
	return err
}

func (r *ResourceRepository) Update(ctx context.Context, res *models.Resource) error {
	res.UpdatedAt = time.Now()
	query := `UPDATE resources SET display_name=$1, description=$2, parameters_schema=$3, enabled=$4, updated_at=$5 WHERE id=$6`
	args := []interface{}{res.DisplayName, res.Description, []byte(res.ParametersSchema), res.Enabled, res.UpdatedAt, res.ID}
	if res.OrgID != "" {
		query += ` AND (org_id=$7 OR user_id=$7)`
		args = append(args, res.OrgID)
	}
	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}

func (r *ResourceRepository) Delete(ctx context.Context, id, orgID string) error {
	query := `DELETE FROM resources WHERE id = $1`
	args := []interface{}{id}
	if orgID != "" {
		query += ` AND (org_id = $2 OR user_id = $2)`
		args = append(args, orgID)
	}
	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}

func (r *ResourceRepository) GetResourceWithBackends(ctx context.Context, userID, resourceName string) (*models.ResourceWithBackends, error) {
	res, err := r.FindByOrgAndName(ctx, userID, resourceName)
	if err != nil {
		return nil, err
	}
	return r.attachBackends(ctx, res)
}

func (r *ResourceRepository) GetResourceWithBackendsByID(ctx context.Context, id, orgID string) (*models.ResourceWithBackends, error) {
	res, err := r.FindByID(ctx, id, orgID)
	if err != nil {
		return nil, err
	}
	return r.attachBackends(ctx, res)
}

func (r *ResourceRepository) attachBackends(ctx context.Context, res *models.Resource) (*models.ResourceWithBackends, error) {
	backendRepo := NewResourceBackendRepository(r.db)
	backends, err := backendRepo.ListEnabledByResourceID(ctx, res.ID)
	if err != nil {
		return nil, err
	}
	return &models.ResourceWithBackends{Resource: *res, Backends: backends}, nil
}
