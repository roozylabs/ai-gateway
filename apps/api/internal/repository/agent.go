package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/lib/pq"
	"github.com/roozylabs/prism/internal/models"
)

type AgentRepository struct {
	db *sql.DB
}

func NewAgentRepository(db *sql.DB) *AgentRepository {
	return &AgentRepository{db: db}
}

const agentColumns = `id, user_id, name, display_name, description, agent_type, system_prompt_override, allowed_models, allowed_tools, allowed_resources, allowed_mcp_servers, max_budget_cents, status, enabled, created_at, updated_at`

func scanAgent(row interface{ Scan(...interface{}) error }, a *models.Agent) error {
	var allowedModels, allowedTools, allowedResources, allowedMCPServers pq.StringArray
	err := row.Scan(
		&a.ID, &a.UserID, &a.Name, &a.DisplayName, &a.Description, &a.AgentType,
		&a.SystemPromptOverride, &allowedModels, &allowedTools, &allowedResources, &allowedMCPServers,
		&a.MaxBudgetCents, &a.Status, &a.Enabled, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return err
	}
	a.AllowedModels = []string(allowedModels)
	a.AllowedTools = []string(allowedTools)
	a.AllowedResources = []string(allowedResources)
	a.AllowedMCPServers = []string(allowedMCPServers)
	if a.AllowedModels == nil {
		a.AllowedModels = []string{}
	}
	if a.AllowedTools == nil {
		a.AllowedTools = []string{}
	}
	if a.AllowedResources == nil {
		a.AllowedResources = []string{}
	}
	if a.AllowedMCPServers == nil {
		a.AllowedMCPServers = []string{}
	}
	return nil
}

func (r *AgentRepository) ListByUserID(ctx context.Context, userID string) ([]models.Agent, error) {
	query := `SELECT ` + agentColumns + ` FROM agents`
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

	var agents []models.Agent
	for rows.Next() {
		var a models.Agent
		if err := scanAgent(rows, &a); err != nil {
			return nil, err
		}
		agents = append(agents, a)
	}
	return agents, rows.Err()
}

func (r *AgentRepository) FindByID(ctx context.Context, id, userID string) (*models.Agent, error) {
	var a models.Agent
	query := `SELECT ` + agentColumns + ` FROM agents WHERE id = $1`
	var args []interface{}
	args = append(args, id)
	if userID != "" {
		query += ` AND (user_id = $2 OR user_id = 'user_admin' OR user_id = '')`
		args = append(args, userID)
	}
	err := scanAgent(r.db.QueryRowContext(ctx, query, args...), &a)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AgentRepository) FindByUserAndName(ctx context.Context, userID, name string) (*models.Agent, error) {
	var a models.Agent
	query := `SELECT ` + agentColumns + ` FROM agents WHERE name = $1`
	var args []interface{}
	args = append(args, name)
	if userID != "" {
		query += ` AND (user_id = $2 OR user_id = 'user_admin' OR user_id = '')`
		args = append(args, userID)
	}
	err := scanAgent(r.db.QueryRowContext(ctx, query, args...), &a)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AgentRepository) Create(ctx context.Context, a *models.Agent) error {
	now := time.Now()
	if a.AgentType == "" {
		a.AgentType = "general"
	}
	if a.Status == "" {
		a.Status = "active"
	}
	return r.db.QueryRowContext(ctx,
		`INSERT INTO agents (user_id, name, display_name, description, agent_type, system_prompt_override, allowed_models, allowed_tools, allowed_resources, allowed_mcp_servers, max_budget_cents, status, enabled, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		 RETURNING id, created_at, updated_at`,
		a.UserID, a.Name, a.DisplayName, a.Description, a.AgentType, a.SystemPromptOverride,
		pq.Array(a.AllowedModels), pq.Array(a.AllowedTools), pq.Array(a.AllowedResources), pq.Array(a.AllowedMCPServers),
		a.MaxBudgetCents, a.Status, a.Enabled, now, now,
	).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
}

func (r *AgentRepository) Update(ctx context.Context, a *models.Agent) error {
	a.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`UPDATE agents SET display_name=$1, description=$2, agent_type=$3, system_prompt_override=$4, allowed_models=$5, allowed_tools=$6, allowed_resources=$7, allowed_mcp_servers=$8, max_budget_cents=$9, status=$10, enabled=$11, updated_at=$12
		 WHERE id = $13`,
		a.DisplayName, a.Description, a.AgentType, a.SystemPromptOverride,
		pq.Array(a.AllowedModels), pq.Array(a.AllowedTools), pq.Array(a.AllowedResources), pq.Array(a.AllowedMCPServers),
		a.MaxBudgetCents, a.Status, a.Enabled, a.UpdatedAt, a.ID,
	)
	return err
}

func (r *AgentRepository) Delete(ctx context.Context, id, userID string) error {
	query := `DELETE FROM agents WHERE id = $1`
	var args []interface{}
	args = append(args, id)
	if userID != "" {
		query += ` AND (user_id = $2 OR user_id = 'user_admin' OR user_id = '')`
		args = append(args, userID)
	}
	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}
