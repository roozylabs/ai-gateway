package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/proxy"
	"github.com/roozylabs/prism/internal/repository"
)

type AgentHandler struct {
	repo       *repository.AgentRepository
	governance *proxy.AgentGovernanceEngine
}

func NewAgentHandler(repo *repository.AgentRepository, governance *proxy.AgentGovernanceEngine) *AgentHandler {
	return &AgentHandler{repo: repo, governance: governance}
}

type CreateAgentRequest struct {
	Name                 string   `json:"name" binding:"required"`
	DisplayName          string   `json:"displayName"`
	Description          string   `json:"description"`
	AgentType            string   `json:"agentType"`
	SystemPromptOverride string   `json:"systemPromptOverride"`
	AllowedModels        []string `json:"allowedModels"`
	AllowedModelsSnake   []string `json:"allowed_models"`
	AllowedTools         []string `json:"allowedTools"`
	AllowedToolsSnake    []string `json:"allowed_tools"`
	AllowedResources     []string `json:"allowedResources"`
	AllowedResourcesSnake []string `json:"allowed_resources"`
	MaxBudgetCents       int      `json:"maxBudgetCents"`
	MaxBudgetCentsSnake  int      `json:"max_budget_cents"`
	BudgetCapUSD         float64  `json:"budget_cap_usd"`
	Status               string   `json:"status"`
	Enabled              *bool    `json:"enabled"`
}

func (h *AgentHandler) List(c *gin.Context) {
	userID := c.GetString("userId")
	agents, err := h.repo.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list agents: " + err.Error()})
		return
	}
	if agents == nil {
		agents = []models.Agent{}
	}
	c.JSON(http.StatusOK, agents)
}

func (h *AgentHandler) Get(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	agent, err := h.repo.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
		return
	}
	c.JSON(http.StatusOK, agent)
}

func (h *AgentHandler) Create(c *gin.Context) {
	userID := c.GetString("userId")
	var req CreateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	allowedModels := req.AllowedModels
	if len(allowedModels) == 0 && len(req.AllowedModelsSnake) > 0 {
		allowedModels = req.AllowedModelsSnake
	}
	allowedTools := req.AllowedTools
	if len(allowedTools) == 0 && len(req.AllowedToolsSnake) > 0 {
		allowedTools = req.AllowedToolsSnake
	}
	allowedResources := req.AllowedResources
	if len(allowedResources) == 0 && len(req.AllowedResourcesSnake) > 0 {
		allowedResources = req.AllowedResourcesSnake
	}

	maxBudgetCents := req.MaxBudgetCents
	if maxBudgetCents == 0 && req.MaxBudgetCentsSnake > 0 {
		maxBudgetCents = req.MaxBudgetCentsSnake
	}
	if maxBudgetCents == 0 && req.BudgetCapUSD > 0 {
		maxBudgetCents = int(req.BudgetCapUSD * 100)
	}

	agent := &models.Agent{
		UserID:               userID,
		Name:                 req.Name,
		DisplayName:          req.DisplayName,
		Description:          req.Description,
		AgentType:            req.AgentType,
		SystemPromptOverride: req.SystemPromptOverride,
		AllowedModels:        allowedModels,
		AllowedTools:         allowedTools,
		AllowedResources:     allowedResources,
		MaxBudgetCents:       maxBudgetCents,
		Status:               "active",
		Enabled:              enabled,
	}

	if err := h.repo.Create(c.Request.Context(), agent); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create agent: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, agent)
}

func (h *AgentHandler) Update(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	existing, err := h.repo.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
		return
	}

	var req CreateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	existing.DisplayName = req.DisplayName
	existing.Description = req.Description
	if req.AgentType != "" {
		existing.AgentType = req.AgentType
	}
	existing.SystemPromptOverride = req.SystemPromptOverride

	allowedModels := req.AllowedModels
	if len(allowedModels) == 0 && len(req.AllowedModelsSnake) > 0 {
		allowedModels = req.AllowedModelsSnake
	}
	if len(allowedModels) > 0 {
		existing.AllowedModels = allowedModels
	}

	allowedTools := req.AllowedTools
	if len(allowedTools) == 0 && len(req.AllowedToolsSnake) > 0 {
		allowedTools = req.AllowedToolsSnake
	}
	if len(allowedTools) > 0 {
		existing.AllowedTools = allowedTools
	}

	allowedResources := req.AllowedResources
	if len(allowedResources) == 0 && len(req.AllowedResourcesSnake) > 0 {
		allowedResources = req.AllowedResourcesSnake
	}
	if len(allowedResources) > 0 {
		existing.AllowedResources = allowedResources
	}

	maxBudgetCents := req.MaxBudgetCents
	if maxBudgetCents == 0 && req.MaxBudgetCentsSnake > 0 {
		maxBudgetCents = req.MaxBudgetCentsSnake
	}
	if maxBudgetCents == 0 && req.BudgetCapUSD > 0 {
		maxBudgetCents = int(req.BudgetCapUSD * 100)
	}
	if maxBudgetCents > 0 {
		existing.MaxBudgetCents = maxBudgetCents
	}
	if req.Enabled != nil {
		existing.Enabled = *req.Enabled
	}

	if err := h.repo.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update agent"})
		return
	}
	c.JSON(http.StatusOK, existing)
}

func (h *AgentHandler) Delete(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	if err := h.repo.Delete(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete agent"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "agent deleted"})
}
