package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/username/ai-gateway/internal/models"
)

type GatewayKeyRepository struct {
	db *sql.DB
}

func NewGatewayKeyRepository(db *sql.DB) *GatewayKeyRepository {
	return &GatewayKeyRepository{db: db}
}

func (r *GatewayKeyRepository) Create(ctx context.Context, k *models.GatewayAPIKey) error {
	if k.ID == "" {
		k.ID = uuid.New().String()
	}
	k.CreatedAt = time.Now()
	k.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO gateway_api_keys (id, user_id, name, key_hash, key_prefix, enabled, rate_limit, allowed_models, expires_at, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		k.ID, k.UserID, k.Name, k.KeyHash, k.KeyPrefix,
		k.Enabled, k.RateLimit, pq.Array(k.AllowedModels),
		k.ExpiresAt, k.CreatedAt, k.UpdatedAt,
	)
	return err
}

func (r *GatewayKeyRepository) FindByKeyHash(ctx context.Context, keyHash string) (*models.GatewayAPIKey, error) {
	k := &models.GatewayAPIKey{}
	var allowedModels []string
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, name, key_hash, key_prefix, enabled, rate_limit, allowed_models,
		        expires_at, last_used_at, request_count, created_at, updated_at
		 FROM gateway_api_keys WHERE key_hash = $1 AND enabled = true`, keyHash,
	).Scan(&k.ID, &k.UserID, &k.Name, &k.KeyHash, &k.KeyPrefix,
		&k.Enabled, &k.RateLimit, pq.Array(&allowedModels),
		&k.ExpiresAt, &k.LastUsedAt, &k.RequestCount, &k.CreatedAt, &k.UpdatedAt)
	if err != nil {
		return nil, err
	}
	k.AllowedModels = allowedModels
	return k, nil
}

func (r *GatewayKeyRepository) ListByUserID(ctx context.Context, userID string) ([]models.GatewayAPIKey, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, name, key_hash, key_prefix, enabled, rate_limit, allowed_models,
		        expires_at, last_used_at, request_count, created_at, updated_at
		 FROM gateway_api_keys WHERE user_id = $1 ORDER BY created_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []models.GatewayAPIKey
	for rows.Next() {
		var k models.GatewayAPIKey
		var allowedModels []string
		if err := rows.Scan(&k.ID, &k.UserID, &k.Name, &k.KeyHash, &k.KeyPrefix,
			&k.Enabled, &k.RateLimit, pq.Array(&allowedModels),
			&k.ExpiresAt, &k.LastUsedAt, &k.RequestCount, &k.CreatedAt, &k.UpdatedAt); err != nil {
			return nil, err
		}
		k.AllowedModels = allowedModels
		keys = append(keys, k)
	}
	return keys, nil
}

func (r *GatewayKeyRepository) Update(ctx context.Context, k *models.GatewayAPIKey) error {
	k.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`UPDATE gateway_api_keys SET name=$1, enabled=$2, rate_limit=$3, allowed_models=$4, expires_at=$5, updated_at=$6
		 WHERE id=$7`,
		k.Name, k.Enabled, k.RateLimit, pq.Array(k.AllowedModels),
		k.ExpiresAt, k.UpdatedAt, k.ID,
	)
	return err
}

func (r *GatewayKeyRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM gateway_api_keys WHERE id = $1`, id)
	return err
}

func (r *GatewayKeyRepository) IncrementUsage(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE gateway_api_keys SET request_count = request_count + 1, last_used_at = NOW() WHERE id = $1`, id)
	return err
}
