package proxy

import (
	"testing"

	"github.com/roozylabs/prism/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestAdaptiveScoring_PresetPolicies(t *testing.T) {
	cheapModel := &models.Model{
		ID:               "m1",
		Slug:             "cheap-model",
		ProviderID:       "p1",
		InputPricePer1M:  0.15,
		OutputPricePer1M: 0.60,
		QualityScore:     0.70,
		SpeedScore:       0.90,
		CodingScore:      0.70,
		ReasoningScore:   0.70,
		WritingScore:     0.70,
	}

	qualityModel := &models.Model{
		ID:               "m2",
		Slug:             "quality-model",
		ProviderID:       "p2",
		InputPricePer1M:  3.00,
		OutputPricePer1M: 15.00,
		QualityScore:     0.98,
		SpeedScore:       0.60,
		CodingScore:      0.95,
		ReasoningScore:   0.98,
		WritingScore:     0.95,
	}

	candidates := []*models.Model{cheapModel, qualityModel}
	chars := RequestCharacteristics{
		Task:          TaskCoding,
		Complexity:    ComplexityHigh,
		ContextTokens: 2000,
	}

	// 1. Cheap policy test
	cheapPolicy := &RoutingPolicy{
		Name: "cheap",
		Weights: map[string]float64{
			"task_match": 0.10,
			"quality":    0.10,
			"cost":       0.70,
			"speed":      0.10,
		},
	}
	cheapScores := ScoreCandidatesWithBudgetAndTelemetry(candidates, chars, cheapPolicy, "healthy", nil, nil)
	assert.Len(t, cheapScores, 2)
	assert.Equal(t, "cheap-model", cheapScores[0].Model.Slug)

	// 2. Quality policy test
	qualityPolicy := &RoutingPolicy{
		Name: "quality",
		Weights: map[string]float64{
			"task_match": 0.40,
			"quality":    0.40,
			"cost":       0.05,
			"speed":      0.15,
		},
	}
	qualityScores := ScoreCandidatesWithBudgetAndTelemetry(candidates, chars, qualityPolicy, "healthy", nil, nil)
	assert.Len(t, qualityScores, 2)
	assert.Equal(t, "quality-model", qualityScores[0].Model.Slug)

	// Sub-score verification
	assert.Greater(t, qualityScores[0].QualityScore, 0.90)
	assert.Equal(t, 1.0, qualityScores[0].HealthScore)
}

func TestAdaptiveScoring_HealthPenaltyWeighting(t *testing.T) {
	m1 := &models.Model{
		ID:           "m1",
		Slug:         "model-unhealthy",
		ProviderID:   "prov-unhealthy",
		QualityScore: 0.95,
		SpeedScore:   0.90,
	}
	m2 := &models.Model{
		ID:           "m2",
		Slug:         "model-healthy",
		ProviderID:   "prov-healthy",
		QualityScore: 0.85,
		SpeedScore:   0.85,
	}

	candidates := []*models.Model{m1, m2}
	chars := RequestCharacteristics{Task: TaskGeneral}
	policy := &RoutingPolicy{
		Name: "balanced",
		Weights: map[string]float64{
			"quality": 0.50,
			"speed":   0.50,
		},
	}

	healthScores := map[string]float64{
		"prov-unhealthy": 0.10, // Degrading health
		"prov-healthy":   1.00, // Perfect health
	}

	scores := ScoreCandidatesWithBudgetAndTelemetry(candidates, chars, policy, "healthy", nil, healthScores)
	assert.Len(t, scores, 2)
	assert.Equal(t, "model-healthy", scores[0].Model.Slug)
	assert.Contains(t, scores[1].Reason, "health_penalty")
}
