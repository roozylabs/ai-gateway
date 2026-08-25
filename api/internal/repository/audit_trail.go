package repository

import (
	"context"
	"database/sql"

	"github.com/lib/pq"
	"github.com/roozylabs/prism/internal/models"
)

type AuditTrailRepository struct {
	db *sql.DB
}

func NewAuditTrailRepository(db *sql.DB) *AuditTrailRepository {
	return &AuditTrailRepository{db: db}
}

const auditColumns = `id, request_id, user_id, gateway_key_id, agent_id, agent_name, user_role, model_slug, failover_chain, tools_invoked, resources_accessed, mcp_servers_called, prompt_tokens, completion_tokens, total_tokens, total_cost_usd, status_code, latency_ms, ttft_ms, prompt_hash, response_hash, compliance_status, signature_hash, created_at`

func scanAudit(row interface{ Scan(...interface{}) error }, a *models.AIAuditTrail) error {
	var gatewayKeyId, agentId, agentName sql.NullString
	err := row.Scan(
		&a.ID, &a.RequestID, &a.UserID, &gatewayKeyId, &agentId, &agentName,
		&a.UserRole, &a.ModelSlug, &a.FailoverChain, &a.ToolsInvoked, &a.ResourcesAccessed, &a.MCPServersCalled,
		&a.PromptTokens, &a.CompletionTokens, &a.TotalTokens, &a.TotalCostUSD, &a.StatusCode, &a.LatencyMS, &a.TTFTMS,
		&a.PromptHash, &a.ResponseHash, &a.ComplianceStatus, &a.SignatureHash, &a.CreatedAt,
	)
	if err != nil {
		return err
	}
	if gatewayKeyId.Valid {
		a.GatewayKeyID = &gatewayKeyId.String
	}
	if agentId.Valid {
		a.AgentID = &agentId.String
	}
	if agentName.Valid {
		a.AgentName = &agentName.String
	}
	return nil
}

func (r *AuditTrailRepository) Create(ctx context.Context, a *models.AIAuditTrail) error {
	if a.FailoverChain == nil {
		a.FailoverChain = pq.StringArray{}
	}
	if a.ToolsInvoked == nil {
		a.ToolsInvoked = pq.StringArray{}
	}
	if a.ResourcesAccessed == nil {
		a.ResourcesAccessed = pq.StringArray{}
	}
	if a.MCPServersCalled == nil {
		a.MCPServersCalled = pq.StringArray{}
	}
	if a.UserRole == "" {
		a.UserRole = "developer"
	}
	if a.ComplianceStatus == "" {
		a.ComplianceStatus = "compliant"
	}

	return r.db.QueryRowContext(ctx,
		`INSERT INTO ai_audit_trails (
			request_id, user_id, gateway_key_id, agent_id, agent_name, user_role, model_slug,
			failover_chain, tools_invoked, resources_accessed, mcp_servers_called,
			prompt_tokens, completion_tokens, total_tokens, total_cost_usd, status_code,
			latency_ms, ttft_ms, prompt_hash, response_hash, compliance_status, signature_hash
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
		) RETURNING id, created_at`,
		a.RequestID, a.UserID, a.GatewayKeyID, a.AgentID, a.AgentName, a.UserRole, a.ModelSlug,
		a.FailoverChain, a.ToolsInvoked, a.ResourcesAccessed, a.MCPServersCalled,
		a.PromptTokens, a.CompletionTokens, a.TotalTokens, a.TotalCostUSD, a.StatusCode,
		a.LatencyMS, a.TTFTMS, a.PromptHash, a.ResponseHash, a.ComplianceStatus, a.SignatureHash,
	).Scan(&a.ID, &a.CreatedAt)
}

func (r *AuditTrailRepository) ListWithFilter(ctx context.Context, filter models.AuditTrailFilter) ([]models.AIAuditTrail, int, error) {
	query := `SELECT ` + auditColumns + ` FROM ai_audit_trails WHERE 1=1`
	countQuery := `SELECT COUNT(*) FROM ai_audit_trails WHERE 1=1`
	var args []interface{}
	paramIdx := 1

	if filter.UserID != "" {
		query += ` AND (user_id = $` + string(rune('0'+paramIdx)) + ` OR user_id = 'user_admin' OR user_id = '')`
		countQuery += ` AND (user_id = $` + string(rune('0'+paramIdx)) + ` OR user_id = 'user_admin' OR user_id = '')`
		args = append(args, filter.UserID)
		paramIdx++
	}

	if filter.AgentName != "" {
		query += ` AND agent_name = $` + string(rune('0'+paramIdx))
		countQuery += ` AND agent_name = $` + string(rune('0'+paramIdx))
		args = append(args, filter.AgentName)
		paramIdx++
	}

	if filter.ModelSlug != "" {
		query += ` AND model_slug = $` + string(rune('0'+paramIdx))
		countQuery += ` AND model_slug = $` + string(rune('0'+paramIdx))
		args = append(args, filter.ModelSlug)
		paramIdx++
	}

	if filter.ComplianceStatus != "" {
		query += ` AND compliance_status = $` + string(rune('0'+paramIdx))
		countQuery += ` AND compliance_status = $` + string(rune('0'+paramIdx))
		args = append(args, filter.ComplianceStatus)
		paramIdx++
	}

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query += ` ORDER BY created_at DESC`
	if filter.Limit > 0 {
		query += ` LIMIT $` + string(rune('0'+paramIdx))
		args = append(args, filter.Limit)
		paramIdx++
	} else {
		query += ` LIMIT 50`
	}

	if filter.Offset > 0 {
		query += ` OFFSET $` + string(rune('0'+paramIdx))
		args = append(args, filter.Offset)
		paramIdx++
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var trails []models.AIAuditTrail
	for rows.Next() {
		var a models.AIAuditTrail
		if err := scanAudit(rows, &a); err != nil {
			return nil, 0, err
		}
		trails = append(trails, a)
	}
	return trails, total, rows.Err()
}

func (r *AuditTrailRepository) FindByID(ctx context.Context, id, userID string) (*models.AIAuditTrail, error) {
	var a models.AIAuditTrail
	query := `SELECT ` + auditColumns + ` FROM ai_audit_trails WHERE id = $1`
	var args []interface{}
	args = append(args, id)
	if userID != "" {
		query += ` AND (user_id = $2 OR user_id = 'user_admin' OR user_id = '')`
		args = append(args, userID)
	}
	err := scanAudit(r.db.QueryRowContext(ctx, query, args...), &a)
	if err != nil {
		return nil, err
	}
	return &a, nil
}
