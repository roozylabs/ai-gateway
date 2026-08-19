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
		`INSERT INTO request_logs (id, gateway_api_key_id, provider_id, credential_id, model,
		                          status_code, latency_ms, input_tokens, output_tokens, total_tokens,
		                          error_message, retry_count, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		log.ID, log.GatewayAPIKeyID, log.ProviderID, log.CredentialID, log.Model,
		log.StatusCode, log.LatencyMs, log.InputTokens, log.OutputTokens, log.TotalTokens,
		log.ErrorMessage, log.RetryCount, log.CreatedAt,
	)
	return err
}

func (r *RequestLogRepository) ListByUserID(ctx context.Context, userID string, limit, offset int) ([]models.RequestLog, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT rl.id, rl.gateway_api_key_id, rl.provider_id, rl.credential_id, rl.model,
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
		if err := rows.Scan(&l.ID, &l.GatewayAPIKeyID, &l.ProviderID, &l.CredentialID,
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
		`SELECT rl.id, rl.gateway_api_key_id, rl.provider_id, rl.credential_id, rl.model,
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
		if err := rows.Scan(&l.ID, &l.GatewayAPIKeyID, &l.ProviderID, &l.CredentialID,
			&l.Model, &l.StatusCode, &l.LatencyMs, &l.InputTokens, &l.OutputTokens,
			&l.TotalTokens, &l.ErrorMessage, &l.RetryCount, &l.CreatedAt); err != nil {
			return nil, 0, err
		}
		logs = append(logs, l)
	}
	return logs, total, nil
}
