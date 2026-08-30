package repository

import (
	"context"
	"database/sql"

	"github.com/roozylabs/prism/internal/models"
)

type MCPInvocationRepository struct {
	db *sql.DB
}

func NewMCPInvocationRepository(db *sql.DB) *MCPInvocationRepository {
	return &MCPInvocationRepository{db: db}
}

func (r *MCPInvocationRepository) SaveInvocation(ctx context.Context, inv *models.MCPInvocation) error {
	var errMsg *string
	if inv.ErrorMessage != nil && *inv.ErrorMessage != "" {
		errMsg = inv.ErrorMessage
	}
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO mcp_server_invocations (user_id, mcp_server_id, tool_name, status_code, is_error, error_message, latency_ms, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
		inv.UserID, inv.MCPServerID, inv.ToolName, inv.StatusCode, inv.IsError, errMsg, inv.LatencyMs,
	)
	return err
}

func (r *MCPInvocationRepository) GetStats(ctx context.Context, userID, mcpServerID string, days int) (*models.MCPServerStats, error) {
	if days <= 0 || days > 90 {
		days = 30
	}

	stats := &models.MCPServerStats{
		Tools:  []models.MCPToolStat{},
		Agents: []models.MCPAgentBinding{},
	}

	// 1. Overall totals & success rate
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*),
		        COALESCE(SUM(CASE WHEN is_error = FALSE THEN 1 ELSE 0 END), 0),
		        COALESCE(SUM(CASE WHEN is_error = TRUE THEN 1 ELSE 0 END), 0),
		        COALESCE(AVG(latency_ms), 0)
		 FROM mcp_server_invocations
		 WHERE user_id = $1 AND mcp_server_id = $2
		   AND created_at >= NOW() - ($3 || ' days')::INTERVAL`,
		userID, mcpServerID, days,
	).Scan(&stats.TotalRequests, &stats.SuccessCount, &stats.ErrorCount, &stats.AvgLatencyMs)
	if err != nil {
		return nil, err
	}

	if stats.TotalRequests > 0 {
		stats.SuccessRate = float64(stats.SuccessCount) / float64(stats.TotalRequests)
	}

	// 2. Per-tool breakdown
	rowsTools, err := r.db.QueryContext(ctx,
		`SELECT tool_name,
		        COUNT(*) as requests,
		        COALESCE(SUM(CASE WHEN is_error = TRUE THEN 1 ELSE 0 END), 0) as errors,
		        COALESCE(AVG(latency_ms), 0) as avg_latency
		 FROM mcp_server_invocations
		 WHERE user_id = $1 AND mcp_server_id = $2
		   AND created_at >= NOW() - ($3 || ' days')::INTERVAL
		 GROUP BY tool_name
		 ORDER BY requests DESC, avg_latency DESC`,
		userID, mcpServerID, days,
	)
	if err == nil {
		defer func() { _ = rowsTools.Close() }()
		for rowsTools.Next() {
			var t models.MCPToolStat
			if err := rowsTools.Scan(&t.Tool, &t.Requests, &t.Errors, &t.AvgLatencyMs); err != nil {
				return nil, err
			}
			stats.Tools = append(stats.Tools, t)
		}
		if err := rowsTools.Err(); err != nil {
			return nil, err
		}
	} else {
		return nil, err
	}

	return stats, nil
}
