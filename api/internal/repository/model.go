package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/roozylabs/ai-gateway/internal/models"
)

type ModelRepository struct {
	db *sql.DB
}

func NewModelRepository(db *sql.DB) *ModelRepository {
	return &ModelRepository{db: db}
}

func (r *ModelRepository) ListByProviderID(ctx context.Context, providerID string) ([]models.Model, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, provider_id, name, slug, display_name, enabled, created_at, updated_at
		 FROM models WHERE provider_id = $1 ORDER BY created_at DESC`, providerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var modelList []models.Model
	for rows.Next() {
		var m models.Model
		if err := rows.Scan(&m.ID, &m.ProviderID, &m.Name, &m.Slug, &m.DisplayName,
			&m.Enabled, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		modelList = append(modelList, m)
	}
	return modelList, nil
}

func (r *ModelRepository) FindByID(ctx context.Context, id string) (*models.Model, error) {
	m := &models.Model{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, provider_id, name, slug, display_name, enabled, created_at, updated_at
		 FROM models WHERE id = $1`, id,
	).Scan(&m.ID, &m.ProviderID, &m.Name, &m.Slug, &m.DisplayName,
		&m.Enabled, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *ModelRepository) FindBySlug(ctx context.Context, slug string) (*models.Model, error) {
	m := &models.Model{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, provider_id, name, slug, display_name, enabled, created_at, updated_at
		 FROM models WHERE slug = $1`, slug,
	).Scan(&m.ID, &m.ProviderID, &m.Name, &m.Slug, &m.DisplayName,
		&m.Enabled, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *ModelRepository) FindBySlugAndProvider(ctx context.Context, slug, providerID string) (*models.Model, error) {
	m := &models.Model{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, provider_id, name, slug, display_name, enabled, created_at, updated_at
		 FROM models WHERE slug = $1 AND provider_id = $2`, slug, providerID,
	).Scan(&m.ID, &m.ProviderID, &m.Name, &m.Slug, &m.DisplayName,
		&m.Enabled, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *ModelRepository) Create(ctx context.Context, m *models.Model) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	m.CreatedAt = time.Now()
	m.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO models (id, provider_id, name, slug, display_name, enabled, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		m.ID, m.ProviderID, m.Name, m.Slug, m.DisplayName,
		m.Enabled, m.CreatedAt, m.UpdatedAt,
	)
	return err
}

func (r *ModelRepository) Update(ctx context.Context, m *models.Model) error {
	m.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`UPDATE models SET name=$1, slug=$2, display_name=$3, enabled=$4, updated_at=$5
		 WHERE id=$6`,
		m.Name, m.Slug, m.DisplayName, m.Enabled, m.UpdatedAt, m.ID,
	)
	return err
}

func (r *ModelRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM models WHERE id = $1`, id)
	return err
}
