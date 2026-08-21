package repository

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/roozylabs/ai-gateway/internal/models"
)

type ModelPricingRepository struct {
	db *sql.DB
}

func NewModelPricingRepository(db *sql.DB) *ModelPricingRepository {
	return &ModelPricingRepository{db: db}
}

func (r *ModelPricingRepository) GetByModelAndProvider(ctx context.Context, modelSlug, providerType string) (*models.ModelPricing, error) {
	var p models.ModelPricing
	err := r.db.QueryRowContext(ctx,
		`SELECT id, model_slug, provider_type, prompt_price_per_1m, completion_price_per_1m,
		        cached_prompt_price_per_1m, effective_date, created_at, updated_at
		 FROM model_pricings
		 WHERE model_slug = $1 AND provider_type = $2
		 ORDER BY effective_date DESC
		 LIMIT 1`, modelSlug, providerType,
	).Scan(&p.ID, &p.ModelSlug, &p.ProviderType, &p.PromptPricePer1M,
		&p.CompletionPricePer1M, &p.CachedPromptPricePer1M, &p.EffectiveDate,
		&p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ModelPricingRepository) CalculateCost(modelSlug, providerType string, inputTokens, outputTokens int) float64 {
	ctx := context.Background()
	pricing, err := r.GetByModelAndProvider(ctx, modelSlug, providerType)
	if err == nil {
		inputCost := (float64(inputTokens) / 1_000_000.0) * pricing.PromptPricePer1M
		outputCost := (float64(outputTokens) / 1_000_000.0) * pricing.CompletionPricePer1M
		return inputCost + outputCost
	}

	var inputPrice, outputPrice float64
	err = r.db.QueryRowContext(ctx, "SELECT input_price_per_1m, output_price_per_1m FROM models WHERE slug = $1 LIMIT 1", modelSlug).Scan(&inputPrice, &outputPrice)
	if err == nil && (inputPrice > 0 || outputPrice > 0) {
		return (float64(inputTokens)/1_000_000.0)*inputPrice + (float64(outputTokens)/1_000_000.0)*outputPrice
	}

	return calculateCostHeuristic(modelSlug, inputTokens+outputTokens)
}

func calculateCostHeuristic(model string, tokens int) float64 {
	rate := 0.001
	mLower := strings.ToLower(model)
	if strings.Contains(mLower, "pickle") || strings.Contains(mLower, "gpt-4") || strings.Contains(mLower, "claude-3") || strings.Contains(mLower, "opus") || strings.Contains(mLower, "sonnet") {
		rate = 0.002
	} else if strings.Contains(mLower, "flash") || strings.Contains(mLower, "mini") || strings.Contains(mLower, "haiku") || strings.Contains(mLower, "nano") {
		rate = 0.00015
	}
	return (float64(tokens) / 1000.0) * rate
}

func (r *ModelPricingRepository) ListAll(ctx context.Context) ([]models.ModelPricing, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, model_slug, provider_type, prompt_price_per_1m, completion_price_per_1m,
		        cached_prompt_price_per_1m, effective_date, created_at, updated_at
		 FROM model_pricings
		 ORDER BY provider_type, model_slug`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pricings []models.ModelPricing
	for rows.Next() {
		var p models.ModelPricing
		if err := rows.Scan(&p.ID, &p.ModelSlug, &p.ProviderType, &p.PromptPricePer1M,
			&p.CompletionPricePer1M, &p.CachedPromptPricePer1M, &p.EffectiveDate,
			&p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		pricings = append(pricings, p)
	}
	return pricings, rows.Err()
}

func (r *ModelPricingRepository) Upsert(ctx context.Context, p *models.ModelPricing) error {
	if p.ID == "" {
		p.ID = "gen_random_uuid()"
	}
	if p.CreatedAt.IsZero() {
		p.CreatedAt = time.Now()
	}
	p.UpdatedAt = time.Now()

	_, err := r.db.ExecContext(ctx,
		`INSERT INTO model_pricings (id, model_slug, provider_type, prompt_price_per_1m, completion_price_per_1m, cached_prompt_price_per_1m, effective_date, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 ON CONFLICT (model_slug, provider_type) DO UPDATE SET
		     prompt_price_per_1m = EXCLUDED.prompt_price_per_1m,
		     completion_price_per_1m = EXCLUDED.completion_price_per_1m,
		     cached_prompt_price_per_1m = EXCLUDED.cached_prompt_price_per_1m,
		     effective_date = EXCLUDED.effective_date,
		     updated_at = EXCLUDED.updated_at`,
		p.ID, p.ModelSlug, p.ProviderType, p.PromptPricePer1M, p.CompletionPricePer1M,
		p.CachedPromptPricePer1M, p.EffectiveDate, p.CreatedAt, p.UpdatedAt,
	)
	return err
}
