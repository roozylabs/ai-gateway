package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/roozylabs/prism/internal/models"
)

type ToolBackendRepository struct {
	db *sql.DB
}

func NewToolBackendRepository(db *sql.DB) *ToolBackendRepository {
	return &ToolBackendRepository{db: db}
}

const toolBackendColumns = `id, tool_id, name, backend_type, endpoint_url, auth_token_encrypted, auth_header_name, auth_header_prefix, timeout_ms, priority, enabled, created_at, updated_at`

func (r *ToolBackendRepository) ListByToolID(ctx context.Context, toolID string) ([]models.ToolBackend, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+toolBackendColumns+` FROM tool_backends WHERE tool_id = $1 ORDER BY priority ASC, created_at ASC`, toolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanToolBackends(rows)
}

func (r *ToolBackendRepository) FindByID(ctx context.Context, id string) (*models.ToolBackend, error) {
	var b models.ToolBackend
	err := r.db.QueryRowContext(ctx,
		`SELECT `+toolBackendColumns+` FROM tool_backends WHERE id = $1`, id,
	).Scan(&b.ID, &b.ToolID, &b.Name, &b.BackendType, &b.EndpointURL, &b.AuthTokenEncrypted, &b.AuthHeaderName, &b.AuthHeaderPrefix, &b.TimeoutMs, &b.Priority, &b.Enabled, &b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (r *ToolBackendRepository) ListEnabledByToolID(ctx context.Context, toolID string) ([]models.ToolBackend, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+toolBackendColumns+` FROM tool_backends WHERE tool_id = $1 AND enabled = true ORDER BY priority ASC`, toolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanToolBackends(rows)
}

func (r *ToolBackendRepository) Create(ctx context.Context, b *models.ToolBackend) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	now := time.Now()
	b.CreatedAt = now
	b.UpdatedAt = now
	if b.BackendType == "" {
		b.BackendType = "http"
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
		`INSERT INTO tool_backends (id, tool_id, name, backend_type, endpoint_url, auth_token_encrypted, auth_header_name, auth_header_prefix, timeout_ms, priority, enabled, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		b.ID, b.ToolID, b.Name, b.BackendType, b.EndpointURL, b.AuthTokenEncrypted, b.AuthHeaderName, b.AuthHeaderPrefix, b.TimeoutMs, b.Priority, b.Enabled, b.CreatedAt, b.UpdatedAt)
	return err
}

func (r *ToolBackendRepository) Update(ctx context.Context, b *models.ToolBackend) error {
	b.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`UPDATE tool_backends SET name=$1, backend_type=$2, endpoint_url=$3, auth_token_encrypted=$4,
		 auth_header_name=$5, auth_header_prefix=$6, timeout_ms=$7, priority=$8, enabled=$9, updated_at=$10
		 WHERE id=$11`,
		b.Name, b.BackendType, b.EndpointURL, b.AuthTokenEncrypted, b.AuthHeaderName, b.AuthHeaderPrefix, b.TimeoutMs, b.Priority, b.Enabled, b.UpdatedAt, b.ID)
	return err
}

func (r *ToolBackendRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM tool_backends WHERE id = $1`, id)
	return err
}

func (r *ToolBackendRepository) DeleteByToolID(ctx context.Context, toolID string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM tool_backends WHERE tool_id = $1`, toolID)
	return err
}

func scanToolBackends(rows *sql.Rows) ([]models.ToolBackend, error) {
	defer rows.Close()
	var backends []models.ToolBackend
	for rows.Next() {
		var b models.ToolBackend
		if err := rows.Scan(&b.ID, &b.ToolID, &b.Name, &b.BackendType, &b.EndpointURL, &b.AuthTokenEncrypted, &b.AuthHeaderName, &b.AuthHeaderPrefix, &b.TimeoutMs, &b.Priority, &b.Enabled, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		backends = append(backends, b)
	}
	return backends, rows.Err()
}
