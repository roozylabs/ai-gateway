package proxy

import (
	"fmt"

	"github.com/roozylabs/ai-gateway/internal/models"
)

type RoutingPolicy struct {
	Name        string
	Weights     map[string]float64
	Constraints map[string]float64
}

type ModelScore struct {
	Model  *models.Model
	Score  float64
	Reason []string
}

type RoutingDecision struct {
	RequestID        string
	PromptPreview    string
	Task             string
	Complexity       string
	PolicyName       string
	Candidates       []string
	SelectedModel    string
	SelectedProvider string
	BudgetStatus     string
	EstimatedCost    float64
	DowngradeReason  string
	ScoresBreakdown  map[string]interface{}
}

func ScoreCandidates(candidates []*models.Model, chars RequestCharacteristics, policy *RoutingPolicy) []*ModelScore {
	if len(candidates) == 0 || policy == nil {
		return nil
	}

	// Hard filter: remove models with insufficient context window
	var filtered []*models.Model
	for _, m := range candidates {
		if m.ContextWindow > 0 && m.ContextWindow < chars.ContextTokens {
			continue
		}
		filtered = append(filtered, m)
	}

	if len(filtered) == 0 {
		return nil
	}

	// Hard filter: remove models exceeding max cost (with 1.3x tolerance)
	if maxCost, ok := policy.Constraints["max_cost_per_request"]; ok && maxCost > 0 {
		var costFiltered []*models.Model
		for _, m := range filtered {
			outputRatio := OutputRatioByTask(chars.Task)
			estimatedCost := estimateModelCost(m, chars.ContextTokens, outputRatio)
			if estimatedCost <= maxCost*1.3 {
				costFiltered = append(costFiltered, m)
			}
		}
		if len(costFiltered) > 0 {
			filtered = costFiltered
		}
	}

	// Find max prices among candidates for normalization
	maxInput := 0.0
	maxOutput := 0.0
	for _, m := range filtered {
		if m.InputPricePer1M > maxInput {
			maxInput = m.InputPricePer1M
		}
		if m.OutputPricePer1M > maxOutput {
			maxOutput = m.OutputPricePer1M
		}
	}

	scores := make([]*ModelScore, 0, len(filtered))
	for _, m := range filtered {
		var reasons []string

		// Task match score
		taskScore := taskMatchScore(m, chars.Task)
		taskWeight := policy.Weights["task_match"]

		// Quality score (already 0-1)
		qualityScore := m.QualityScore
		qualityWeight := policy.Weights["quality"]

		// Cost score (normalized 0-1, lower price = higher score)
		costScore := 0.0
		if maxInput+maxOutput > 0 {
			costScore = 1.0 - (m.InputPricePer1M+m.OutputPricePer1M)/(maxInput+maxOutput)
		}
		costWeight := policy.Weights["cost"]

		// Speed score (already 0-1)
		speedScore := m.SpeedScore
		speedWeight := policy.Weights["speed"]

		score := taskScore*taskWeight + qualityScore*qualityWeight + costScore*costWeight + speedScore*speedWeight

		reasons = append(reasons, "task="+string(chars.Task))
		reasons = append(reasons, "quality="+formatFloat(qualityScore))

		scores = append(scores, &ModelScore{
			Model:  m,
			Score:  score,
			Reason: reasons,
		})
	}

	// Sort by score descending (simple insertion sort, candidates typically <20)
	for i := 1; i < len(scores); i++ {
		for j := i; j > 0 && scores[j].Score > scores[j-1].Score; j-- {
			scores[j], scores[j-1] = scores[j-1], scores[j]
		}
	}

	return scores
}

// taskMatchScore returns the model's score for the detected task type.
func taskMatchScore(m *models.Model, task TaskType) float64 {
	switch task {
	case TaskCoding:
		return m.CodingScore
	case TaskReasoning:
		return m.ReasoningScore
	case TaskWriting:
		return m.WritingScore
	default:
		return m.QualityScore
	}
}

// estimateModelCost estimates the cost of a request to a model in USD.
func estimateModelCost(m *models.Model, inputTokens int, outputRatio float64) float64 {
	outputTokens := float64(inputTokens) * outputRatio
	inputCost := m.InputPricePer1M * float64(inputTokens) / 1_000_000.0
	outputCost := m.OutputPricePer1M * outputTokens / 1_000_000.0
	return inputCost + outputCost
}

func formatFloat(f float64) string {
	return fmt.Sprintf("%.2f", f)
}

// Budget pressure thresholds (matching model input price per 1M tokens)
const expensiveModelInputPrice = 2.00 // USD per 1M input tokens

// ScoreCandidatesWithBudget scores candidates with budget-aware downgrade rules.
//
// Rules:
//   - healthy  → normal scoring
//   - warning  → ×0.8 penalty for expensive models (input > $2/1M)
//   - critical → filter out expensive models, ×0.6 penalty for all remaining
//   - exceeded → cheapest model only; if hardLimit, only free models survive
func ScoreCandidatesWithBudget(candidates []*models.Model, chars RequestCharacteristics, policy *RoutingPolicy, budgetStatus string) []*ModelScore {
	scores := ScoreCandidates(candidates, chars, policy)
	if len(scores) == 0 {
		return nil
	}

	switch budgetStatus {
	case "warning":
		for _, s := range scores {
			if s.Model.InputPricePer1M > expensiveModelInputPrice {
				s.Score *= 0.8
				s.Reason = append(s.Reason, "budget_warning_penalty")
			}
		}
	case "critical":
		var kept []*ModelScore
		for _, s := range scores {
			if s.Model.InputPricePer1M > expensiveModelInputPrice {
				continue
			}
			s.Score *= 0.6
			s.Reason = append(s.Reason, "budget_critical_penalty")
			kept = append(kept, s)
		}
		if len(kept) > 0 {
			scores = kept
		}
	case "exceeded":
		// Only the cheapest candidate survives
		var kept []*ModelScore
		for _, s := range scores {
			if len(kept) == 0 || s.Model.InputPricePer1M+s.Model.OutputPricePer1M < kept[0].Model.InputPricePer1M+kept[0].Model.OutputPricePer1M {
				kept = append([]*ModelScore{s}, kept...)
			} else {
				kept = append(kept, s)
			}
		}
		if len(kept) > 0 {
			winner := kept[0]
			winner.Reason = append(winner.Reason, "budget_exceeded_cheapest_only")
			scores = []*ModelScore{winner}
		}
	}

	// Re-sort after modifications
	for i := 1; i < len(scores); i++ {
		for j := i; j > 0 && scores[j].Score > scores[j-1].Score; j-- {
			scores[j], scores[j-1] = scores[j-1], scores[j]
		}
	}

	return scores
}
