package repository

import (
	"context"
	"database/sql"
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

const resourceColumns = `id, user_id, name, display_name, description, parameters_schema, enabled, created_at, updated_at`

func (r *ResourceRepository) ListByUserID(ctx context.Context, userID string) ([]models.Resource, error) {
	query := `SELECT ` + resourceColumns + ` FROM resources`
	var args []interface{}
	if userID != "" {
		query += ` WHERE user_id = $1 OR user_id = 'user_admin' OR user_id = ''`
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
		if err := rows.Scan(&res.ID, &res.UserID, &res.Name, &res.DisplayName, &res.Description, &res.ParametersSchema, &res.Enabled, &res.CreatedAt, &res.UpdatedAt); err != nil {
			return nil, err
		}
		resources = append(resources, res)
	}
	return resources, rows.Err()
}

func (r *ResourceRepository) FindByID(ctx context.Context, id, userID string) (*models.Resource, error) {
	var res models.Resource
	err := r.db.QueryRowContext(ctx,
		`SELECT `+resourceColumns+` FROM resources WHERE id = $1 AND user_id = $2`, id, userID,
	).Scan(&res.ID, &res.UserID, &res.Name, &res.DisplayName, &res.Description, &res.ParametersSchema, &res.Enabled, &res.CreatedAt, &res.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func (r *ResourceRepository) FindByUserAndName(ctx context.Context, userID, name string) (*models.Resource, error) {
	var res models.Resource
	err := r.db.QueryRowContext(ctx,
		`SELECT `+resourceColumns+` FROM resources WHERE user_id = $1 AND name = $2`, userID, name,
	).Scan(&res.ID, &res.UserID, &res.Name, &res.DisplayName, &res.Description, &res.ParametersSchema, &res.Enabled, &res.CreatedAt, &res.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func (r *ResourceRepository) Create(ctx context.Context, res *models.Resource) error {
	if res.ID == "" {
		res.ID = uuid.New().String()
	}
	now := time.Now()
	res.CreatedAt = now
	res.UpdatedAt = now
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO resources (id, user_id, name, display_name, description, parameters_schema, enabled, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		res.ID, res.UserID, res.Name, res.DisplayName, res.Description, []byte(res.ParametersSchema), res.Enabled, res.CreatedAt, res.UpdatedAt)
	return err
}

func (r *ResourceRepository) Update(ctx context.Context, res *models.Resource) error {
	res.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`UPDATE resources SET display_name=$1, description=$2, parameters_schema=$3, enabled=$4, updated_at=$5
		 WHERE id=$6 AND user_id=$7`,
		res.DisplayName, res.Description, []byte(res.ParametersSchema), res.Enabled, res.UpdatedAt, res.ID, res.UserID)
	return err
}

func (r *ResourceRepository) Delete(ctx context.Context, id, userID string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM resources WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (r *ResourceRepository) GetResourceWithBackends(ctx context.Context, userID, resourceName string) (*models.ResourceWithBackends, error) {
	res, err := r.FindByUserAndName(ctx, userID, resourceName)
	if err != nil {
		return nil, err
	}
	return r.attachBackends(ctx, res)
}

func (r *ResourceRepository) GetResourceWithBackendsByID(ctx context.Context, id, userID string) (*models.ResourceWithBackends, error) {
	res, err := r.FindByID(ctx, id, userID)
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
