package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/roozylabs/ai-gateway/internal/models"
	"github.com/roozylabs/ai-gateway/internal/utils"
)

type CredentialRepository struct {
	db *sql.DB
}

func NewCredentialRepository(db *sql.DB) *CredentialRepository {
	return &CredentialRepository{db: db}
}

func (r *CredentialRepository) ListByProviderID(ctx context.Context, providerID string) ([]models.Credential, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, provider_id, name, encrypted_key, key_prefix, priority, enabled, status,
		        last_used_at, request_count, error_count, last_error, last_error_at,
		        created_at, updated_at
		 FROM credentials WHERE provider_id = $1 ORDER BY priority ASC`, providerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var credentials []models.Credential
	for rows.Next() {
		var c models.Credential
		if err := rows.Scan(&c.ID, &c.ProviderID, &c.Name, &c.EncryptedKey, &c.KeyPrefix,
			&c.Priority, &c.Enabled, &c.Status, &c.LastUsedAt, &c.RequestCount,
			&c.ErrorCount, &c.LastError, &c.LastErrorAt, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		credentials = append(credentials, c)
	}
	return credentials, nil
}

func (r *CredentialRepository) FindByID(ctx context.Context, id string) (*models.Credential, error) {
	c := &models.Credential{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, provider_id, name, encrypted_key, key_prefix, priority, enabled, status,
		        last_used_at, request_count, error_count, last_error, last_error_at,
		        created_at, updated_at
		 FROM credentials WHERE id = $1`, id,
	).Scan(&c.ID, &c.ProviderID, &c.Name, &c.EncryptedKey, &c.KeyPrefix,
		&c.Priority, &c.Enabled, &c.Status, &c.LastUsedAt, &c.RequestCount,
		&c.ErrorCount, &c.LastError, &c.LastErrorAt, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CredentialRepository) Create(ctx context.Context, c *models.Credential) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	c.CreatedAt = time.Now()
	c.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO credentials (id, provider_id, name, encrypted_key, key_prefix, priority, enabled, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		c.ID, c.ProviderID, c.Name, c.EncryptedKey, c.KeyPrefix,
		c.Priority, c.Enabled, c.Status, c.CreatedAt, c.UpdatedAt,
	)
	return err
}

func (r *CredentialRepository) Update(ctx context.Context, c *models.Credential) error {
	c.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`UPDATE credentials SET name=$1, encrypted_key=$2, key_prefix=$3, priority=$4,
		        enabled=$5, status=$6, updated_at=$7
		 WHERE id=$8`,
		c.Name, c.EncryptedKey, c.KeyPrefix, c.Priority,
		c.Enabled, c.Status, c.UpdatedAt, c.ID,
	)
	return err
}

func (r *CredentialRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM credentials WHERE id = $1`, id)
	return err
}

func (r *CredentialRepository) FindActiveByProviderID(ctx context.Context, providerID string) (*models.Credential, error) {
	c := &models.Credential{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, provider_id, name, encrypted_key, key_prefix, priority, enabled, status,
		        last_used_at, request_count, error_count, last_error, last_error_at,
		        created_at, updated_at
		 FROM credentials WHERE provider_id = $1 AND enabled = true AND status = 'active'
		 ORDER BY priority ASC LIMIT 1`, providerID,
	).Scan(&c.ID, &c.ProviderID, &c.Name, &c.EncryptedKey, &c.KeyPrefix,
		&c.Priority, &c.Enabled, &c.Status, &c.LastUsedAt, &c.RequestCount,
		&c.ErrorCount, &c.LastError, &c.LastErrorAt, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CredentialRepository) DecryptKey(ctx context.Context, credentialID, encryptionKey string) (string, error) {
	c, err := r.FindByID(ctx, credentialID)
	if err != nil {
		return "", err
	}
	return utils.DecryptAES256GCM(c.EncryptedKey, encryptionKey)
}
