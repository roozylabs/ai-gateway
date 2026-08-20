package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/roozylabs/ai-gateway/internal/models"
)

type RequestLogRepository struct {
	db *sql.DB
}

func NewRequestLogRepository(db *sql.DB) *RequestLogRepository {
	return &RequestLogRepository{db: db}
}

func (r *RequestLogRepository) Create(ctx context.Context, log *models.RequestLog) error {
	if log.ID == "" {
		log.ID = uuid.New().String()
	}
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now()
	}
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO request_logs (id, request_id, gateway_api_key_id, provider_id, credential_id, model,
		                          status_code, latency_ms, input_tokens, output_tokens, total_tokens,
		                          error_message, retry_count, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		log.ID, log.RequestID, log.GatewayAPIKeyID, log.ProviderID, log.CredentialID, log.Model,
		log.StatusCode, log.LatencyMs, log.InputTokens, log.OutputTokens, log.TotalTokens,
		log.ErrorMessage, log.RetryCount, log.CreatedAt,
	)
	return err
}

func (r *RequestLogRepository) ListByUserID(ctx context.Context, userID string, limit, offset int) ([]models.RequestLog, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT rl.id, rl.request_id, rl.gateway_api_key_id, rl.provider_id, rl.credential_id, rl.model,
		        rl.status_code, rl.latency_ms, rl.input_tokens, rl.output_tokens, rl.total_tokens,
		        rl.error_message, rl.retry_count, rl.created_at
		 FROM request_logs rl
		 INNER JOIN gateway_api_keys gak ON rl.gateway_api_key_id = gak.id
		 WHERE gak.user_id = $1
		 ORDER BY rl.created_at DESC
		 LIMIT $2 OFFSET $3`, userID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.RequestLog
	for rows.Next() {
		var l models.RequestLog
		if err := rows.Scan(&l.ID, &l.RequestID, &l.GatewayAPIKeyID, &l.ProviderID, &l.CredentialID,
			&l.Model, &l.StatusCode, &l.LatencyMs, &l.InputTokens, &l.OutputTokens,
			&l.TotalTokens, &l.ErrorMessage, &l.RetryCount, &l.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, nil
}

type LogFilter struct {
	UserID   string
	Provider string
	Model    string
	Status   int
	Search   string
	Limit    int
	Offset   int
}

func (r *RequestLogRepository) ListWithFilter(ctx context.Context, f LogFilter) ([]models.RequestLog, int, error) {
	where := []string{"gak.user_id = $1"}
	args := []interface{}{f.UserID}
	argIdx := 2

	if f.Provider != "" {
		where = append(where, fmt.Sprintf("p.slug = $%d", argIdx))
		args = append(args, f.Provider)
		argIdx++
	}
	if f.Model != "" {
		where = append(where, fmt.Sprintf("rl.model = $%d", argIdx))
		args = append(args, f.Model)
		argIdx++
	}
	if f.Status > 0 {
		where = append(where, fmt.Sprintf("rl.status_code = $%d", argIdx))
		args = append(args, f.Status)
		argIdx++
	}
	if f.Search != "" {
		where = append(where, fmt.Sprintf("(rl.model ILIKE $%d OR rl.error_message ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}

	whereClause := strings.Join(where, " AND ")

	countQuery := fmt.Sprintf(
		`SELECT COUNT(*) FROM request_logs rl
		 INNER JOIN gateway_api_keys gak ON rl.gateway_api_key_id = gak.id
		 LEFT JOIN providers p ON rl.provider_id = p.id
		 WHERE %s`, whereClause)

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := f.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := f.Offset

	query := fmt.Sprintf(
		`SELECT rl.id, rl.request_id, rl.gateway_api_key_id, rl.provider_id, rl.credential_id, rl.model,
		        rl.status_code, rl.latency_ms, rl.input_tokens, rl.output_tokens, rl.total_tokens,
		        rl.error_message, rl.retry_count, rl.created_at
		 FROM request_logs rl
		 INNER JOIN gateway_api_keys gak ON rl.gateway_api_key_id = gak.id
		 LEFT JOIN providers p ON rl.provider_id = p.id
		 WHERE %s
		 ORDER BY rl.created_at DESC
		 LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []models.RequestLog
	for rows.Next() {
		var l models.RequestLog
		if err := rows.Scan(&l.ID, &l.RequestID, &l.GatewayAPIKeyID, &l.ProviderID, &l.CredentialID,
			&l.Model, &l.StatusCode, &l.LatencyMs, &l.InputTokens, &l.OutputTokens,
			&l.TotalTokens, &l.ErrorMessage, &l.RetryCount, &l.CreatedAt); err != nil {
			return nil, 0, err
		}
		logs = append(logs, l)
	}
	return logs, total, nil
}

type DashboardStats struct {
	TotalRequests     int64   `json:"totalRequests"`
	TotalTokens       int64   `json:"totalTokens"`
	AvgLatency        float64 `json:"avgLatency"`
	ErrorRate         float64 `json:"errorRate"`
	ActiveProviders   int     `json:"activeProviders"`
	ActiveCredentials int     `json:"activeCredentials"`
	ActiveKeys        int     `json:"activeKeys"`
}

type UsagePoint struct {
	Date     string `json:"date"`
	Model    string `json:"model"`
	Requests int64  `json:"requests"`
	Tokens   int64  `json:"tokens"`
}

func (r *RequestLogRepository) GetStats(ctx context.Context, userID string) (*DashboardStats, error) {
	s := &DashboardStats{}

	err := r.db.QueryRowContext(ctx,
		`SELECT COALESCE(COUNT(*), 0),
		        COALESCE(SUM(total_tokens), 0),
		        COALESCE(AVG(latency_ms), 0),
		        COALESCE(CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status_code >= 400))::float / COUNT(*) * 100 ELSE 0 END, 0)
		 FROM request_logs rl
		 INNER JOIN gateway_api_keys gak ON rl.gateway_api_key_id = gak.id
		 WHERE gak.user_id = $1`, userID,
	).Scan(&s.TotalRequests, &s.TotalTokens, &s.AvgLatency, &s.ErrorRate)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM providers WHERE user_id = $1 AND enabled = true`, userID,
	).Scan(&s.ActiveProviders)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM credentials c
		 INNER JOIN providers p ON c.provider_id = p.id
		 WHERE p.user_id = $1 AND c.enabled = true AND c.status = 'active'`, userID,
	).Scan(&s.ActiveCredentials)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM gateway_api_keys WHERE user_id = $1 AND enabled = true`, userID,
	).Scan(&s.ActiveKeys)
	if err != nil {
		return nil, err
	}

	return s, nil
}

func (r *RequestLogRepository) GetUsageChart(ctx context.Context, userID string, days int, startDate, endDate string) ([]UsagePoint, error) {
	var query string
	var args []interface{}

	if startDate != "" && endDate != "" {
		query = `SELECT TO_CHAR(rl.created_at, 'YYYY-MM-DD') as date,
		        COALESCE(NULLIF(rl.model, ''), 'default') as model,
		        COUNT(*) as requests,
		        COALESCE(SUM(total_tokens), 0) as tokens
		 FROM request_logs rl
		 INNER JOIN gateway_api_keys gak ON rl.gateway_api_key_id = gak.id
		 WHERE gak.user_id = $1
		   AND rl.created_at >= $2::DATE
		   AND rl.created_at <= ($3::DATE + INTERVAL '1 day')
		 GROUP BY TO_CHAR(rl.created_at, 'YYYY-MM-DD'), COALESCE(NULLIF(rl.model, ''), 'default')
		 ORDER BY date ASC, model ASC`
		args = []interface{}{userID, startDate, endDate}
	} else {
		if days <= 0 || days > 30 {
			days = 30
		}
		query = `SELECT TO_CHAR(rl.created_at, 'YYYY-MM-DD') as date,
		        COALESCE(NULLIF(rl.model, ''), 'default') as model,
		        COUNT(*) as requests,
		        COALESCE(SUM(total_tokens), 0) as tokens
		 FROM request_logs rl
		 INNER JOIN gateway_api_keys gak ON rl.gateway_api_key_id = gak.id
		 WHERE gak.user_id = $1
		   AND rl.created_at >= NOW() - ($2 || ' days')::INTERVAL
		 GROUP BY TO_CHAR(rl.created_at, 'YYYY-MM-DD'), COALESCE(NULLIF(rl.model, ''), 'default')
		 ORDER BY date ASC, model ASC`
		args = []interface{}{userID, days}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []UsagePoint
	for rows.Next() {
		var p UsagePoint
		if err := rows.Scan(&p.Date, &p.Model, &p.Requests, &p.Tokens); err != nil {
			return nil, err
		}
		points = append(points, p)
	}
	return points, nil
}

type ProviderHealth struct {
	Name      string `json:"name"`
	Type      string `json:"type"`
	Status    string `json:"status"`
	CredCount int    `json:"credCount"`
}

func (r *RequestLogRepository) GetProviderHealth(ctx context.Context, userID string) ([]ProviderHealth, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT p.name, p.type, p.enabled,
		        (SELECT COUNT(*) FROM credentials c WHERE c.provider_id = p.id AND c.enabled = true AND c.status = 'active') as cred_count
		 FROM providers p
		 WHERE p.user_id = $1
		 ORDER BY p.name`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var providers []ProviderHealth
	for rows.Next() {
		var ph ProviderHealth
		var enabled bool
		if err := rows.Scan(&ph.Name, &ph.Type, &enabled, &ph.CredCount); err != nil {
			return nil, err
		}
		if enabled && ph.CredCount > 0 {
			ph.Status = "healthy"
		} else if enabled {
			ph.Status = "degraded"
		} else {
			ph.Status = "down"
		}
		providers = append(providers, ph)
	}
	return providers, nil
}
