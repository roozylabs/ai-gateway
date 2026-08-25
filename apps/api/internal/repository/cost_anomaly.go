package repository

import (
	"context"
	"database/sql"
	"time"
)

type CostAnomaly struct {
	ID             string     `db:"id" json:"id"`
	WindowStart    time.Time  `db:"window_start" json:"window_start"`
	Metric         string     `db:"metric" json:"metric"`
	Observed       float64    `db:"observed" json:"observed"`
	BaselineMean   *float64   `db:"baseline_mean" json:"baseline_mean"`
	BaselineStddev *float64   `db:"baseline_stddev" json:"baseline_stddev"`
	ZScore         *float64   `db:"z_score" json:"z_score"`
	Severity       string     `db:"severity" json:"severity"`
	Details        []byte     `db:"details" json:"details"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
}

type CostAnomalyRepository struct {
	db *sql.DB
}

func NewCostAnomalyRepository(db *sql.DB) *CostAnomalyRepository {
	return &CostAnomalyRepository{db: db}
}

func (r *CostAnomalyRepository) Create(ctx context.Context, a *CostAnomaly) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO cost_anomalies (window_start, metric, observed, baseline_mean, baseline_stddev, z_score, severity, details)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
		a.WindowStart, a.Metric, a.Observed, a.BaselineMean, a.BaselineStddev, a.ZScore, a.Severity, a.Details)
	return err
}

func (r *CostAnomalyRepository) List(ctx context.Context, limit int, severity string) ([]CostAnomaly, error) {
	if limit <= 0 {
		limit = 50
	}
	var rows *sql.Rows
	var err error
	if severity != "" {
		rows, err = r.db.QueryContext(ctx,
			`SELECT id, window_start, metric, observed, baseline_mean, baseline_stddev, z_score, severity, details, created_at
			 FROM cost_anomalies WHERE severity = $1 ORDER BY created_at DESC LIMIT $2`, severity, limit)
	} else {
		rows, err = r.db.QueryContext(ctx,
			`SELECT id, window_start, metric, observed, baseline_mean, baseline_stddev, z_score, severity, details, created_at
			 FROM cost_anomalies ORDER BY created_at DESC LIMIT $1`, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var anomalies []CostAnomaly
	for rows.Next() {
		var a CostAnomaly
		if err := rows.Scan(&a.ID, &a.WindowStart, &a.Metric, &a.Observed, &a.BaselineMean, &a.BaselineStddev, &a.ZScore, &a.Severity, &a.Details, &a.CreatedAt); err != nil {
			return nil, err
		}
		anomalies = append(anomalies, a)
	}
	return anomalies, rows.Err()
}

type HourlySpend struct {
	HourOfDay int     `db:"hour_of_day" json:"hour_of_day"`
	TotalUSD  float64 `db:"total_usd" json:"total_usd"`
}

type DailySpend struct {
	Date     string  `db:"date" json:"date"`
	TotalUSD float64 `db:"total_usd" json:"total_usd"`
}

func (r *CostAnomalyRepository) GetHourlySpendSeries(ctx context.Context, days int) ([]HourlySpend, error) {
	if days <= 0 {
		days = 14
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT EXTRACT(HOUR FROM created_at)::int AS hour_of_day, SUM(cost_usd) AS total_usd
		 FROM request_logs
		 WHERE created_at >= NOW() - ($1 || ' days')::interval AND cost_usd > 0
		 GROUP BY hour_of_day ORDER BY hour_of_day`, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var series []HourlySpend
	for rows.Next() {
		var s HourlySpend
		if err := rows.Scan(&s.HourOfDay, &s.TotalUSD); err != nil {
			return nil, err
		}
		series = append(series, s)
	}
	return series, rows.Err()
}

func (r *CostAnomalyRepository) GetCurrentHourSpend(ctx context.Context) (float64, time.Time, error) {
	var spend *float64
	var windowStart time.Time
	err := r.db.QueryRowContext(ctx,
		`SELECT SUM(cost_usd), date_trunc('hour', NOW())
		 FROM request_logs
		 WHERE created_at >= date_trunc('hour', NOW()) AND cost_usd > 0`,
	).Scan(&spend, &windowStart)
	if err != nil {
		return 0, windowStart, err
	}
	if spend == nil {
		return 0, windowStart, nil
	}
	return *spend, windowStart, nil
}

func (r *CostAnomalyRepository) GetDailySpendSeries(ctx context.Context, days int) ([]DailySpend, error) {
	if days <= 0 {
		days = 28
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT created_at::date::text AS date, SUM(cost_usd) AS total_usd
		 FROM request_logs
		 WHERE created_at >= NOW() - ($1 || ' days')::interval AND cost_usd > 0
		 GROUP BY date ORDER BY date`, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var series []DailySpend
	for rows.Next() {
		var s DailySpend
		if err := rows.Scan(&s.Date, &s.TotalUSD); err != nil {
			return nil, err
		}
		series = append(series, s)
	}
	return series, rows.Err()
}
