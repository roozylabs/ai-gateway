package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/username/ai-gateway/internal/models"
)

type ProviderRepository struct {
	db *sql.DB
}

func NewProviderRepository(db *sql.DB) *ProviderRepository {
	return &ProviderRepository{db: db}
}

func (r *ProviderRepository) ListByUserID(ctx context.Context, userID string) ([]models.Provider, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, name, slug, base_url, type, enabled, created_at, updated_at
		 FROM providers WHERE user_id = $1 ORDER BY created_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var providers []models.Provider
	for rows.Next() {
		var p models.Provider
		if err := rows.Scan(&p.ID, &p.UserID, &p.Name, &p.Slug, &p.BaseURL,
			&p.Type, &p.Enabled, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		providers = append(providers, p)
	}
	return providers, nil
}

func (r *ProviderRepository) FindByID(ctx context.Context, id string) (*models.Provider, error) {
	p := &models.Provider{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, name, slug, base_url, type, enabled, created_at, updated_at
		 FROM providers WHERE id = $1`, id,
	).Scan(&p.ID, &p.UserID, &p.Name, &p.Slug, &p.BaseURL,
		&p.Type, &p.Enabled, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *ProviderRepository) Create(ctx context.Context, p *models.Provider) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	p.CreatedAt = time.Now()
	p.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO providers (id, user_id, name, slug, base_url, type, enabled, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		p.ID, p.UserID, p.Name, p.Slug, p.BaseURL,
		p.Type, p.Enabled, p.CreatedAt, p.UpdatedAt,
	)
	return err
}

func (r *ProviderRepository) Update(ctx context.Context, p *models.Provider) error {
	p.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`UPDATE providers SET name=$1, slug=$2, base_url=$3, type=$4, enabled=$5, updated_at=$6
		 WHERE id=$7`,
		p.Name, p.Slug, p.BaseURL, p.Type, p.Enabled, p.UpdatedAt, p.ID,
	)
	return err
}

func (r *ProviderRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM providers WHERE id = $1`, id)
	return err
}
