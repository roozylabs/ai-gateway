package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/roozylabs/prism/internal/models"
)

type PayloadRepository struct {
	db *sql.DB
}

func NewPayloadRepository(db *sql.DB) *PayloadRepository {
	return &PayloadRepository{db: db}
}

func (r *PayloadRepository) Create(ctx context.Context, p *models.RequestPayload) error {
	var keyID interface{}
	if p.GatewayAPIKeyID != nil && *p.GatewayAPIKeyID != "" {
		keyID = *p.GatewayAPIKeyID
	}

	_, err := r.db.ExecContext(ctx,
		`INSERT INTO request_payloads (request_id, gateway_api_key_id, messages, prompt_hash, byte_size)
		 VALUES ($1::uuid, $2::uuid, $3::jsonb, $4, $5)`,
		p.RequestID, keyID, []byte(p.Messages), p.PromptHash, p.ByteSize,
	)
	return err
}

func (r *PayloadRepository) DeleteOlderThan(ctx context.Context, cutoff time.Time) (int64, error) {
	result, err := r.db.ExecContext(ctx, `DELETE FROM request_payloads WHERE created_at < $1`, cutoff)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}
