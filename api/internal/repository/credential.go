package repository

import (
	"context"
	"database/sql"
	"fmt"
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
		`SELECT id, provider_id, name, encrypted_key, key_prefix, masked_key, priority, enabled, status,
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
		if err := rows.Scan(&c.ID, &c.ProviderID, &c.Name, &c.EncryptedKey, &c.KeyPrefix, &c.MaskedKey,
			&c.Priority, &c.Enabled, &c.Status, &c.LastUsedAt, &c.RequestCount,
			&c.ErrorCount, &c.LastError, &c.LastErrorAt, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		credentials = append(credentials, c)
	}
	return credentials, nil
}

func (r *CredentialRepository) ListWithFilter(ctx context.Context, providerID, search string, limit, offset int) ([]models.Credential, int64, error) {
	query := `SELECT c.id, c.provider_id, COALESCE(p.name, ''), c.name, c.encrypted_key, c.key_prefix, c.masked_key, c.priority, c.enabled, c.status,
		        c.last_used_at, c.request_count, c.error_count, c.last_error, c.last_error_at,
		        c.created_at, c.updated_at
		 FROM credentials c LEFT JOIN providers p ON p.id = c.provider_id WHERE 1=1`
	countQuery := `SELECT COUNT(*) FROM credentials c LEFT JOIN providers p ON p.id = c.provider_id WHERE 1=1`

	var args []interface{}
	var countArgs []interface{}

	if providerID != "" && providerID != "all" {
		args = append(args, providerID)
		countArgs = append(countArgs, providerID)
		filter := fmt.Sprintf(" AND c.provider_id = $%d", len(args))
		query += filter
		countQuery += filter
	}

	if search != "" {
		args = append(args, "%"+search+"%")
		countArgs = append(countArgs, "%"+search+"%")
		filter := fmt.Sprintf(" AND (c.name ILIKE $%d OR c.key_prefix ILIKE $%d OR p.name ILIKE $%d)", len(args), len(args), len(args))
		query += filter
		countQuery += filter
	}

	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query += " ORDER BY c.request_count DESC, c.priority ASC, c.created_at DESC"

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

	var credentials []models.Credential
	for rows.Next() {
		var c models.Credential
		if err := rows.Scan(&c.ID, &c.ProviderID, &c.ProviderName, &c.Name, &c.EncryptedKey, &c.KeyPrefix, &c.MaskedKey,
			&c.Priority, &c.Enabled, &c.Status, &c.LastUsedAt, &c.RequestCount,
			&c.ErrorCount, &c.LastError, &c.LastErrorAt, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, 0, err
		}
		credentials = append(credentials, c)
	}
	return credentials, total, nil
}

func (r *CredentialRepository) FindByID(ctx context.Context, id string) (*models.Credential, error) {
	c := &models.Credential{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, provider_id, name, encrypted_key, key_prefix, masked_key, priority, enabled, status,
		        last_used_at, request_count, error_count, last_error, last_error_at,
		        created_at, updated_at
		 FROM credentials WHERE id = $1`, id,
	).Scan(&c.ID, &c.ProviderID, &c.Name, &c.EncryptedKey, &c.KeyPrefix, &c.MaskedKey,
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
		`INSERT INTO credentials (id, provider_id, name, encrypted_key, key_prefix, masked_key, priority, enabled, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		c.ID, c.ProviderID, c.Name, c.EncryptedKey, c.KeyPrefix, c.MaskedKey,
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
		`SELECT id, provider_id, name, encrypted_key, key_prefix, masked_key, priority, enabled, status,
		        last_used_at, request_count, error_count, last_error, last_error_at,
		        created_at, updated_at
		 FROM credentials WHERE provider_id = $1 AND enabled = true AND status = 'active'
		 ORDER BY priority ASC LIMIT 1`, providerID,
	).Scan(&c.ID, &c.ProviderID, &c.Name, &c.EncryptedKey, &c.KeyPrefix, &c.MaskedKey,
		&c.Priority, &c.Enabled, &c.Status, &c.LastUsedAt, &c.RequestCount,
		&c.ErrorCount, &c.LastError, &c.LastErrorAt, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CredentialRepository) FindAllActiveByProviderID(ctx context.Context, providerID string) ([]models.Credential, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, provider_id, name, encrypted_key, key_prefix, masked_key, priority, enabled, status,
		        last_used_at, request_count, error_count, last_error, last_error_at,
		        created_at, updated_at
		 FROM credentials WHERE provider_id = $1 AND enabled = true AND status = 'active'
		 ORDER BY priority ASC`, providerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creds []models.Credential
	for rows.Next() {
		var c models.Credential
		if err := rows.Scan(&c.ID, &c.ProviderID, &c.Name, &c.EncryptedKey, &c.KeyPrefix, &c.MaskedKey,
			&c.Priority, &c.Enabled, &c.Status, &c.LastUsedAt, &c.RequestCount,
			&c.ErrorCount, &c.LastError, &c.LastErrorAt, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		creds = append(creds, c)
	}
	return creds, nil
}

func (r *CredentialRepository) DecryptKey(ctx context.Context, credentialID, encryptionKey string) (string, error) {
	c, err := r.FindByID(ctx, credentialID)
	if err != nil {
		return "", err
	}
	return utils.DecryptAES256GCM(c.EncryptedKey, encryptionKey)
}

func (r *CredentialRepository) UpdateStatus(ctx context.Context, credentialID, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE credentials SET status = $1, updated_at = NOW() WHERE id = $2`,
		status, credentialID)
	return err
}

func (r *CredentialRepository) FindRoundRobin(ctx context.Context, providerID string) ([]models.Credential, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, provider_id, name, encrypted_key, key_prefix, masked_key, priority, enabled, status,
		        last_used_at, request_count, error_count, last_error, last_error_at,
		        created_at, updated_at
		 FROM credentials WHERE provider_id = $1 AND enabled = true AND status = 'active'
		 ORDER BY request_count ASC, priority ASC`, providerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creds []models.Credential
	for rows.Next() {
		var c models.Credential
		if err := rows.Scan(&c.ID, &c.ProviderID, &c.Name, &c.EncryptedKey, &c.KeyPrefix, &c.MaskedKey,
			&c.Priority, &c.Enabled, &c.Status, &c.LastUsedAt, &c.RequestCount,
			&c.ErrorCount, &c.LastError, &c.LastErrorAt, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		creds = append(creds, c)
	}
	return creds, nil
}

func (r *CredentialRepository) FindLRU(ctx context.Context, providerID string) ([]models.Credential, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, provider_id, name, encrypted_key, key_prefix, masked_key, priority, enabled, status,
		        last_used_at, request_count, error_count, last_error, last_error_at,
		        created_at, updated_at
		 FROM credentials WHERE provider_id = $1 AND enabled = true AND status = 'active'
		 ORDER BY last_used_at ASC NULLS FIRST, priority ASC`, providerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creds []models.Credential
	for rows.Next() {
		var c models.Credential
		if err := rows.Scan(&c.ID, &c.ProviderID, &c.Name, &c.EncryptedKey, &c.KeyPrefix, &c.MaskedKey,
			&c.Priority, &c.Enabled, &c.Status, &c.LastUsedAt, &c.RequestCount,
			&c.ErrorCount, &c.LastError, &c.LastErrorAt, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		creds = append(creds, c)
	}
	return creds, nil
}

func (r *CredentialRepository) IncrementUsage(ctx context.Context, credentialID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE credentials SET request_count = request_count + 1, last_used_at = NOW() WHERE id = $1`, credentialID)
	return err
}
