package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/roozylabs/prism/internal/models"
)

type MCPServerRepository struct {
	db *sql.DB
}

func NewMCPServerRepository(db *sql.DB) *MCPServerRepository {
	return &MCPServerRepository{db: db}
}

const mcpServerColumns = `id, user_id, name, display_name, description, transport_type, endpoint_url, auth_token_encrypted, status, enabled, created_at, updated_at`

func scanMCPServer(row interface{ Scan(...interface{}) error }, s *models.MCPServer) error {
	var authToken *string
	err := row.Scan(&s.ID, &s.UserID, &s.Name, &s.DisplayName, &s.Description, &s.TransportType, &s.EndpointURL, &authToken, &s.Status, &s.Enabled, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return err
	}
	s.AuthTokenEncrypted = authToken
	s.HasAuthToken = authToken != nil && *authToken != ""
	return nil
}

func (r *MCPServerRepository) ListByUserID(ctx context.Context, userID string) ([]models.MCPServer, error) {
	query := `SELECT ` + mcpServerColumns + ` FROM mcp_servers`
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

	var servers []models.MCPServer
	for rows.Next() {
		var s models.MCPServer
		if err := scanMCPServer(rows, &s); err != nil {
			return nil, err
		}
		servers = append(servers, s)
	}
	return servers, rows.Err()
}

func (r *MCPServerRepository) FindByID(ctx context.Context, id, userID string) (*models.MCPServer, error) {
	var s models.MCPServer
	query := `SELECT ` + mcpServerColumns + ` FROM mcp_servers WHERE id = $1`
	var args []interface{}
	args = append(args, id)
	if userID != "" {
		query += ` AND (user_id = $2 OR user_id = 'user_admin' OR user_id = '')`
		args = append(args, userID)
	}
	err := scanMCPServer(r.db.QueryRowContext(ctx, query, args...), &s)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *MCPServerRepository) FindByUserAndName(ctx context.Context, userID, name string) (*models.MCPServer, error) {
	var s models.MCPServer
	query := `SELECT ` + mcpServerColumns + ` FROM mcp_servers WHERE name = $1`
	var args []interface{}
	args = append(args, name)
	if userID != "" {
		query += ` AND (user_id = $2 OR user_id = 'user_admin' OR user_id = '')`
		args = append(args, userID)
	}
	err := scanMCPServer(r.db.QueryRowContext(ctx, query, args...), &s)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *MCPServerRepository) Create(ctx context.Context, s *models.MCPServer) error {
	now := time.Now()
	if s.Status == "" {
		s.Status = "connected"
	}
	return r.db.QueryRowContext(ctx,
		`INSERT INTO mcp_servers (user_id, name, display_name, description, transport_type, endpoint_url, auth_token_encrypted, status, enabled, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		 RETURNING id, created_at, updated_at`,
		s.UserID, s.Name, s.DisplayName, s.Description, s.TransportType, s.EndpointURL, s.AuthTokenEncrypted, s.Status, s.Enabled, now, now,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
}

func (r *MCPServerRepository) Update(ctx context.Context, s *models.MCPServer) error {
	s.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`UPDATE mcp_servers SET display_name=$1, description=$2, transport_type=$3, endpoint_url=$4, auth_token_encrypted=$5, status=$6, enabled=$7, updated_at=$8
		 WHERE id = $9`,
		s.DisplayName, s.Description, s.TransportType, s.EndpointURL, s.AuthTokenEncrypted, s.Status, s.Enabled, s.UpdatedAt, s.ID,
	)
	return err
}

func (r *MCPServerRepository) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE mcp_servers SET status=$1, updated_at=$2 WHERE id = $3`,
		status, time.Now(), id,
	)
	return err
}

func (r *MCPServerRepository) Delete(ctx context.Context, id, userID string) error {
	query := `DELETE FROM mcp_servers WHERE id = $1`
	var args []interface{}
	args = append(args, id)
	if userID != "" {
		query += ` AND (user_id = $2 OR user_id = 'user_admin' OR user_id = '')`
		args = append(args, userID)
	}
	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}

func (r *MCPServerRepository) GetServerWithTools(ctx context.Context, s *models.MCPServer) (*models.MCPServerWithTools, error) {
	toolRepo := NewMCPToolRepository(r.db)
	tools, err := toolRepo.ListByServerID(ctx, s.ID)
	if err != nil {
		return nil, fmt.Errorf("list mcp tools: %w", err)
	}
	return &models.MCPServerWithTools{Server: *s, Tools: tools}, nil
}
