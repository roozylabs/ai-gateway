package repository

import (
	"context"
	"database/sql"
	"time"
)

type ModelLatencyHourly struct {
	ID           string  `db:"id" json:"id"`
	ModelSlug    string  `db:"model_slug" json:"modelSlug"`
	HourStart    time.Time `db:"hour_start" json:"hourStart"`
	AvgTTFTMs    *float64 `db:"avg_ttft_ms" json:"avgTtftMs"`
	AvgLatencyMs *float64 `db:"avg_latency_ms" json:"avgLatencyMs"`
	P95LatencyMs *float64 `db:"p95_latency_ms" json:"p95LatencyMs"`
	SampleCount  *int     `db:"sample_count" json:"sampleCount"`
	SuccessCount *int     `db:"success_count" json:"successCount"`
	CreatedAt    time.Time `db:"created_at" json:"createdAt"`
}

type ModelLatencyHourlyRepository struct {
	db *sql.DB
}

func NewModelLatencyHourlyRepository(db *sql.DB) *ModelLatencyHourlyRepository {
	return &ModelLatencyHourlyRepository{db: db}
}

func (r *ModelLatencyHourlyRepository) Upsert(ctx context.Context, entry *ModelLatencyHourly) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO model_latency_hourly (model_slug, hour_start, avg_ttft_ms, avg_latency_ms, p95_latency_ms, sample_count, success_count)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (model_slug, hour_start) DO NOTHING`,
		entry.ModelSlug, entry.HourStart, entry.AvgTTFTMs, entry.AvgLatencyMs, entry.P95LatencyMs, entry.SampleCount, entry.SuccessCount)
	return err
}
