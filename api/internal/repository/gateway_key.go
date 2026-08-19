package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/roozylabs/ai-gateway/internal/models"
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
		`INSERT INTO gateway_api_keys (id, user_id, provider_id, name, key_hash, key_prefix, enabled, rate_limit, allowed_models, expires_at, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		k.ID, k.UserID, k.ProviderID, k.Name, k.KeyHash, k.KeyPrefix,
		k.Enabled, k.RateLimit, pq.Array(k.AllowedModels),
		k.ExpiresAt, k.CreatedAt, k.UpdatedAt,
	)
	return err
}

func (r *GatewayKeyRepository) FindByKeyHash(ctx context.Context, keyHash string) (*models.GatewayAPIKey, error) {
	k := &models.GatewayAPIKey{}
	var allowedModels []string
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, provider_id, name, key_hash, key_prefix, enabled, rate_limit, allowed_models,
		        expires_at, last_used_at, request_count, created_at, updated_at
		 FROM gateway_api_keys WHERE key_hash = $1 AND enabled = true`, keyHash,
	).Scan(&k.ID, &k.UserID, &k.ProviderID, &k.Name, &k.KeyHash, &k.KeyPrefix,
		&k.Enabled, &k.RateLimit, pq.Array(&allowedModels),
		&k.ExpiresAt, &k.LastUsedAt, &k.RequestCount, &k.CreatedAt, &k.UpdatedAt)
	if err != nil {
		return nil, err
	}
	k.AllowedModels = allowedModels
	return k, nil
}

func (r *GatewayKeyRepository) FindByKeyPrefix(ctx context.Context, keyPrefix string) (*models.GatewayAPIKey, error) {
	k := &models.GatewayAPIKey{}
	var allowedModels []string
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, provider_id, name, key_hash, key_prefix, enabled, rate_limit, allowed_models,
		        expires_at, last_used_at, request_count, created_at, updated_at
		 FROM gateway_api_keys WHERE key_prefix = $1 AND enabled = true`, keyPrefix,
	).Scan(&k.ID, &k.UserID, &k.ProviderID, &k.Name, &k.KeyHash, &k.KeyPrefix,
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
		`SELECT id, user_id, provider_id, name, key_hash, key_prefix, enabled, rate_limit, allowed_models,
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
		if err := rows.Scan(&k.ID, &k.UserID, &k.ProviderID, &k.Name, &k.KeyHash, &k.KeyPrefix,
			&k.Enabled, &k.RateLimit, pq.Array(&allowedModels),
			&k.ExpiresAt, &k.LastUsedAt, &k.RequestCount, &k.CreatedAt, &k.UpdatedAt); err != nil {
			return nil, err
		}
		k.AllowedModels = allowedModels
		keys = append(keys, k)
	}
	return keys, nil
}

func (r *GatewayKeyRepository) ListByUserIDWithFilter(ctx context.Context, userID, search string, limit, offset int) ([]models.GatewayAPIKey, int64, error) {
	query := `SELECT id, user_id, provider_id, name, key_hash, key_prefix, enabled, rate_limit, allowed_models,
		        expires_at, last_used_at, request_count, created_at, updated_at
		 FROM gateway_api_keys WHERE user_id = $1`
	countQuery := `SELECT COUNT(*) FROM gateway_api_keys WHERE user_id = $1`

	args := []interface{}{userID}
	countArgs := []interface{}{userID}

	if search != "" {
		args = append(args, "%"+search+"%")
		countArgs = append(countArgs, "%"+search+"%")
		filter := fmt.Sprintf(" AND (name ILIKE $%d OR key_prefix ILIKE $%d)", len(args), len(args))
		query += filter
		countQuery += filter
	}

	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query += " ORDER BY created_at DESC"

	if limit > 0 {
		args = append(args, limit)
		query += fmt.Sprintf(" LIMIT $%d", len(args))
	}
	if offset > 0 {
		args = append(args, offset)
		query += fmt.Sprintf(" OFFSET $%d", len(args))
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var keys []models.GatewayAPIKey
	for rows.Next() {
		var k models.GatewayAPIKey
		var allowedModels []string
		if err := rows.Scan(&k.ID, &k.UserID, &k.ProviderID, &k.Name, &k.KeyHash, &k.KeyPrefix,
			&k.Enabled, &k.RateLimit, pq.Array(&allowedModels),
			&k.ExpiresAt, &k.LastUsedAt, &k.RequestCount, &k.CreatedAt, &k.UpdatedAt); err != nil {
			return nil, 0, err
		}
		k.AllowedModels = allowedModels
		keys = append(keys, k)
	}
	return keys, total, nil
}

func (r *GatewayKeyRepository) Update(ctx context.Context, k *models.GatewayAPIKey) error {
	k.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`UPDATE gateway_api_keys SET name=$1, enabled=$2, rate_limit=$3, allowed_models=$4, expires_at=$5, provider_id=$6, updated_at=$7
		 WHERE id=$8`,
		k.Name, k.Enabled, k.RateLimit, pq.Array(k.AllowedModels),
		k.ExpiresAt, k.ProviderID, k.UpdatedAt, k.ID,
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
