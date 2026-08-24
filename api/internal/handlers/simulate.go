package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/models"
	"github.com/roozylabs/ai-gateway/internal/proxy"
	goredis "github.com/roozylabs/ai-gateway/internal/redis"
	"github.com/roozylabs/ai-gateway/internal/repository"
)

type SimulateHandler struct {
	models    *repository.ModelRepository
	providers *repository.ProviderRepository
	creds     *repository.CredentialRepository
	policies  *repository.RoutingPolicyRepository
	telemetry *goredis.ModelTelemetryStore
}

func NewSimulateHandler(
	models *repository.ModelRepository,
	providers *repository.ProviderRepository,
	creds *repository.CredentialRepository,
	policies *repository.RoutingPolicyRepository,
	telemetry *goredis.ModelTelemetryStore,
) *SimulateHandler {
	return &SimulateHandler{
		models:    models,
		providers: providers,
		creds:     creds,
		policies:  policies,
		telemetry: telemetry,
	}
}

type SimulateRequest struct {
	Prompt        string             `json:"prompt"`
	PolicyID      string             `json:"policyId"`
	CustomWeights map[string]float64 `json:"customWeights"`
	BudgetStatus  string             `json:"budgetStatus"`
	ProviderID    string             `json:"providerId"`
}

type ModelScoreDetail struct {
	ModelID       string   `json:"modelId"`
	Slug          string   `json:"slug"`
	DisplayName   string   `json:"displayName"`
	ProviderName  string   `json:"providerName"`
	Score         float64  `json:"score"`
	Reasons       []string `json:"reasons"`
	InputPrice1M  float64  `json:"inputPrice1M"`
	OutputPrice1M float64  `json:"outputPrice1M"`
}

type SimulateResponse struct {
	PromptPreview    string             `json:"promptPreview"`
	TaskType         string             `json:"taskType"`
	Complexity       string             `json:"complexity"`
	PolicyName       string             `json:"policyName"`
	WeightsUsed      map[string]float64 `json:"weightsUsed"`
	BudgetStatus     string             `json:"budgetStatus"`
	SelectedModel    string             `json:"selectedModel"`
	SelectedProvider string             `json:"selectedProvider"`
	Candidates       []ModelScoreDetail `json:"candidates"`
	DowngradeReason  string             `json:"downgradeReason"`
}

func (h *SimulateHandler) Simulate(c *gin.Context) {
	userID := c.GetString("userId")

	var req SimulateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if req.Prompt == "" {
		req.Prompt = "Explain Server-Sent Events (SSE) streaming in 2 paragraphs."
	}
	if req.BudgetStatus == "" {
		req.BudgetStatus = "healthy"
	}

	// 1. Classify prompt characteristics
	messages := []map[string]interface{}{
		{"role": "user", "content": req.Prompt},
	}
	chars := proxy.ClassifyRequest(messages)

	promptPreview := req.Prompt
	if len(promptPreview) > 250 {
		promptPreview = promptPreview[:250] + "..."
	}

	// 2. Load policy or custom weights
	var policy *proxy.RoutingPolicy
	policyName := "custom"
	weights := map[string]float64{
		"task_match": 0.35,
		"quality":    0.35,
		"cost":       0.15,
		"speed":      0.15,
	}

	if req.PolicyID != "" {
		if dbPolicy, err := h.policies.FindByID(c.Request.Context(), req.PolicyID, userID); err == nil && dbPolicy != nil {
			policyName = dbPolicy.Name
			if len(dbPolicy.Weights) > 0 {
				weights = dbPolicy.Weights
			}
		}
	} else if len(req.CustomWeights) > 0 {
		weights = req.CustomWeights
	} else {
		// Use default active policy if available
		if dbPolicy, err := h.policies.FindByDefault(c.Request.Context(), userID); err == nil && dbPolicy != nil {
			policyName = dbPolicy.Name
			if len(dbPolicy.Weights) > 0 {
				weights = dbPolicy.Weights
			}
		}
	}

	policy = &proxy.RoutingPolicy{
		Name:        policyName,
		Weights:     weights,
		Constraints: map[string]float64{},
	}

	// 3. Load all enabled models
	allModels, err := h.models.ListEnabled(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load models"})
		return
	}

	// Load providers map
	allProviders, _ := h.providers.ListByUserID(c.Request.Context(), userID)
	providerMap := make(map[string]string)
	for _, p := range allProviders {
		providerMap[p.ID] = p.Name
	}

	// Load active provider IDs with credentials
	activeProviderIDs, _ := h.creds.ListActiveProviderIDs(c.Request.Context())

	// Filter candidate models
	var candidates []*models.Model
	for _, m := range allModels {
		if len(activeProviderIDs) > 0 && !activeProviderIDs[m.ProviderID] {
			continue
		}
		if req.ProviderID != "" && m.ProviderID != req.ProviderID {
			continue
		}
		candidates = append(candidates, &m)
	}

	// 4. Calculate scores with dynamic latency feedback telemetry
	var telemetryMap map[string]*goredis.ModelMetrics
	if h.telemetry != nil && len(candidates) > 0 {
		var candidateSlugs []string
		for _, m := range candidates {
			candidateSlugs = append(candidateSlugs, m.Slug)
		}
		telemetryMap, _ = h.telemetry.GetMultipleModelMetrics(c.Request.Context(), candidateSlugs)
	}

	scores := proxy.ScoreCandidatesWithBudgetAndTelemetry(candidates, chars, policy, req.BudgetStatus, telemetryMap, nil)

	var scoreDetails []ModelScoreDetail
	selectedModel := ""
	selectedProvider := ""
	downgradeReason := ""

	if len(scores) > 0 {
		winner := scores[0]
		selectedModel = winner.Model.Slug
		selectedProvider = providerMap[winner.Model.ProviderID]

		if winner.Score < 0.50 {
			downgradeReason = "low_score_under_budget_pressure"
		}

		for _, s := range scores {
			scoreDetails = append(scoreDetails, ModelScoreDetail{
				ModelID:       s.Model.ID,
				Slug:          s.Model.Slug,
				DisplayName:   s.Model.DisplayName,
				ProviderName:  providerMap[s.Model.ProviderID],
				Score:         s.Score,
				Reasons:       s.Reason,
				InputPrice1M:  s.Model.InputPricePer1M,
				OutputPrice1M: s.Model.OutputPricePer1M,
			})
		}
	}

	c.JSON(http.StatusOK, SimulateResponse{
		PromptPreview:    promptPreview,
		TaskType:         string(chars.Task),
		Complexity:       string(chars.Complexity),
		PolicyName:       policyName,
		WeightsUsed:      weights,
		BudgetStatus:     req.BudgetStatus,
		SelectedModel:    selectedModel,
		SelectedProvider: selectedProvider,
		Candidates:       scoreDetails,
		DowngradeReason:  downgradeReason,
	})
}
