package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/roozylabs/prism/internal/models"
)

type MCPToolRepository struct {
	db *sql.DB
}

func NewMCPToolRepository(db *sql.DB) *MCPToolRepository {
	return &MCPToolRepository{db: db}
}

const mcpToolColumns = `id, mcp_server_id, name, description, input_schema, enabled, created_at, updated_at`

func (r *MCPToolRepository) ListByServerID(ctx context.Context, serverID string) ([]models.MCPTool, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+mcpToolColumns+` FROM mcp_tools WHERE mcp_server_id = $1 ORDER BY name ASC`, serverID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var tools []models.MCPTool
	for rows.Next() {
		var t models.MCPTool
		if err := rows.Scan(&t.ID, &t.MCPServerID, &t.Name, &t.Description, &t.InputSchema, &t.Enabled, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tools = append(tools, t)
	}
	return tools, rows.Err()
}

func (r *MCPToolRepository) Create(ctx context.Context, t *models.MCPTool) error {
	now := time.Now()
	schema := t.InputSchema
	if len(schema) == 0 {
		schema = json.RawMessage(`{}`)
	}
	return r.db.QueryRowContext(ctx,
		`INSERT INTO mcp_tools (mcp_server_id, name, description, input_schema, enabled, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at, updated_at`,
		t.MCPServerID, t.Name, t.Description, schema, t.Enabled, now, now,
	).Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)
}

func (r *MCPToolRepository) DeleteByServerID(ctx context.Context, serverID string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM mcp_tools WHERE mcp_server_id = $1`, serverID)
	return err
}

func (r *MCPToolRepository) BatchUpsert(ctx context.Context, serverID string, tools []models.MCPTool) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	_, err = tx.ExecContext(ctx, `DELETE FROM mcp_tools WHERE mcp_server_id = $1`, serverID)
	if err != nil {
		return err
	}

	now := time.Now()
	for _, t := range tools {
		schema := t.InputSchema
		if len(schema) == 0 {
			schema = json.RawMessage(`{}`)
		}
		_, err := tx.ExecContext(ctx,
			`INSERT INTO mcp_tools (mcp_server_id, name, description, input_schema, enabled, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			serverID, t.Name, t.Description, schema, true, now, now,
		)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
