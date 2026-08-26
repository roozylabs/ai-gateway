package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/roozylabs/prism/internal/models"
)

type SettingRepository struct {
	db *sql.DB
}

func NewSettingRepository(db *sql.DB) *SettingRepository {
	return &SettingRepository{db: db}
}

func (r *SettingRepository) Get(ctx context.Context, key string) (string, error) {
	var value string
	err := r.db.QueryRowContext(ctx, `SELECT value FROM settings WHERE key = $1`, key).Scan(&value)
	if err != nil {
		return "", err
	}
	return value, nil
}

func (r *SettingRepository) Set(ctx context.Context, key, value, category string) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO settings (id, key, value, category, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, NOW(), NOW())
		 ON CONFLICT (key) DO UPDATE SET value = $3, updated_at = NOW()`,
		uuid.New().String(), key, value, category,
	)
	return err
}

func (r *SettingRepository) List(ctx context.Context) ([]models.Setting, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, key, value, category, created_at, updated_at FROM settings ORDER BY category, key`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var settings []models.Setting
	for rows.Next() {
		var s models.Setting
		if err := rows.Scan(&s.ID, &s.Key, &s.Value, &s.Category, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		settings = append(settings, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return settings, nil
}

func (r *SettingRepository) GetAll(ctx context.Context) (map[string]string, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT key, value FROM settings`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	settings := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return nil, err
		}
		settings[key] = value
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return settings, nil
}

func (r *SettingRepository) SetMultiple(ctx context.Context, settings map[string]string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	for key, value := range settings {
		now := time.Now()
		_, err := tx.ExecContext(ctx,
			`INSERT INTO settings (id, key, value, category, created_at, updated_at)
			 VALUES ($1, $2, $3, 'general', $4, $4)
			 ON CONFLICT (key) DO UPDATE SET value = $3, updated_at = $4`,
			uuid.New().String(), key, value, now,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}
