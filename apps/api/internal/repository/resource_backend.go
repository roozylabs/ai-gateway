package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/lib/pq"
	"github.com/google/uuid"
	"github.com/roozylabs/prism/internal/models"
)

type ResourceBackendRepository struct {
	db *sql.DB
}

func NewResourceBackendRepository(db *sql.DB) *ResourceBackendRepository {
	return &ResourceBackendRepository{db: db}
}

const resourceBackendColumns = `id, resource_id, name, backend_type, endpoint_url, http_method, auth_token_encrypted, auth_header_name, auth_header_prefix, query_template, connection_string_encrypted, sql_query, param_names, timeout_ms, priority, enabled, created_at, updated_at`

func (r *ResourceBackendRepository) ListByResourceID(ctx context.Context, resourceID string) ([]models.ResourceBackend, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+resourceBackendColumns+` FROM resource_backends WHERE resource_id = $1 ORDER BY priority ASC, created_at ASC`, resourceID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	return r.scan(rows)
}

func (r *ResourceBackendRepository) FindByID(ctx context.Context, id string) (*models.ResourceBackend, error) {
	var b models.ResourceBackend
	err := r.db.QueryRowContext(ctx,
		`SELECT `+resourceBackendColumns+` FROM resource_backends WHERE id = $1`, id,
	).Scan(&b.ID, &b.ResourceID, &b.Name, &b.BackendType, &b.EndpointURL, &b.HTTPMethod, &b.AuthTokenEncrypted,
		&b.AuthHeaderName, &b.AuthHeaderPrefix, &b.QueryTemplate, &b.ConnectionStringEncrypted,
		&b.SQLQuery, pq.Array(&b.ParamNames), &b.TimeoutMs, &b.Priority, &b.Enabled, &b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (r *ResourceBackendRepository) ListEnabledByResourceID(ctx context.Context, resourceID string) ([]models.ResourceBackend, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+resourceBackendColumns+` FROM resource_backends WHERE resource_id = $1 AND enabled = true ORDER BY priority ASC`, resourceID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	return r.scan(rows)
}

func (r *ResourceBackendRepository) Create(ctx context.Context, b *models.ResourceBackend) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	now := time.Now()
	b.CreatedAt = now
	b.UpdatedAt = now
	if b.BackendType == "" {
		b.BackendType = "rest"
	}
	if b.HTTPMethod == "" {
		b.HTTPMethod = "POST"
	}
	if b.AuthHeaderName == "" {
		b.AuthHeaderName = "Authorization"
	}
	if b.AuthHeaderPrefix == "" {
		b.AuthHeaderPrefix = "Bearer "
	}
	if b.TimeoutMs == 0 {
		b.TimeoutMs = 30000
	}
	if b.Priority == 0 {
		b.Priority = 1
	}
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO resource_backends (id, resource_id, name, backend_type, endpoint_url, http_method, auth_token_encrypted, auth_header_name, auth_header_prefix, query_template, connection_string_encrypted, sql_query, param_names, timeout_ms, priority, enabled, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
		b.ID, b.ResourceID, b.Name, b.BackendType, b.EndpointURL, b.HTTPMethod, b.AuthTokenEncrypted,
		b.AuthHeaderName, b.AuthHeaderPrefix, b.QueryTemplate, b.ConnectionStringEncrypted,
		b.SQLQuery, pq.Array(b.ParamNames), b.TimeoutMs, b.Priority, b.Enabled, b.CreatedAt, b.UpdatedAt)
	return err
}

func (r *ResourceBackendRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM resource_backends WHERE id = $1`, id)
	return err
}

func (r *ResourceBackendRepository) DeleteByResourceID(ctx context.Context, resourceID string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM resource_backends WHERE resource_id = $1`, resourceID)
	return err
}

func (r *ResourceBackendRepository) scan(rows *sql.Rows) ([]models.ResourceBackend, error) {
	defer func() { _ = rows.Close() }()
	var backends []models.ResourceBackend
	for rows.Next() {
		var b models.ResourceBackend
		if err := rows.Scan(&b.ID, &b.ResourceID, &b.Name, &b.BackendType, &b.EndpointURL, &b.HTTPMethod, &b.AuthTokenEncrypted,
			&b.AuthHeaderName, &b.AuthHeaderPrefix, &b.QueryTemplate, &b.ConnectionStringEncrypted,
			&b.SQLQuery, pq.Array(&b.ParamNames), &b.TimeoutMs, &b.Priority, &b.Enabled, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		backends = append(backends, b)
	}
	return backends, rows.Err()
}
