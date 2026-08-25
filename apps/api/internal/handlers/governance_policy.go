package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/proxy"
	"github.com/roozylabs/prism/internal/repository"
)

type GovernancePolicyHandler struct {
	repo       *repository.GovernancePolicyRepository
	rbacEngine *proxy.RBACEngine
}

func NewGovernancePolicyHandler(repo *repository.GovernancePolicyRepository, rbacEngine *proxy.RBACEngine) *GovernancePolicyHandler {
	return &GovernancePolicyHandler{repo: repo, rbacEngine: rbacEngine}
}

type CreateGovernancePolicyRequest struct {
	Name            string `json:"name" binding:"required"`
	Description     string `json:"description"`
	Role            string `json:"role"`
	Effect          string `json:"effect"`
	AgentPattern    string `json:"agentPattern"`
	ModelPattern    string `json:"modelPattern"`
	ToolPattern     string `json:"toolPattern"`
	ResourcePattern string `json:"resourcePattern"`
	Priority        int    `json:"priority"`
	Enabled         *bool  `json:"enabled"`
}

func (h *GovernancePolicyHandler) List(c *gin.Context) {
	userID := c.GetString("userId")
	policies, err := h.repo.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list governance policies: " + err.Error()})
		return
	}
	if policies == nil {
		policies = []models.GovernancePolicy{}
	}
	c.JSON(http.StatusOK, policies)
}

func (h *GovernancePolicyHandler) Get(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	policy, err := h.repo.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "governance policy not found"})
		return
	}
	c.JSON(http.StatusOK, policy)
}

func (h *GovernancePolicyHandler) Create(c *gin.Context) {
	userID := c.GetString("userId")
	var req CreateGovernancePolicyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	policy := &models.GovernancePolicy{
		UserID:          userID,
		Name:            req.Name,
		Description:     req.Description,
		Role:            req.Role,
		Effect:          req.Effect,
		AgentPattern:    req.AgentPattern,
		ModelPattern:    req.ModelPattern,
		ToolPattern:     req.ToolPattern,
		ResourcePattern: req.ResourcePattern,
		Priority:        req.Priority,
		Enabled:         enabled,
	}

	if err := h.repo.Create(c.Request.Context(), policy); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create governance policy: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, policy)
}

func (h *GovernancePolicyHandler) Update(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	existing, err := h.repo.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "governance policy not found"})
		return
	}

	var req CreateGovernancePolicyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	existing.Name = req.Name
	existing.Description = req.Description
	if req.Role != "" {
		existing.Role = req.Role
	}
	if req.Effect != "" {
		existing.Effect = req.Effect
	}
	existing.AgentPattern = req.AgentPattern
	existing.ModelPattern = req.ModelPattern
	existing.ToolPattern = req.ToolPattern
	existing.ResourcePattern = req.ResourcePattern
	if req.Priority > 0 {
		existing.Priority = req.Priority
	}
	if req.Enabled != nil {
		existing.Enabled = *req.Enabled
	}

	if err := h.repo.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update governance policy"})
		return
	}
	c.JSON(http.StatusOK, existing)
}

func (h *GovernancePolicyHandler) Delete(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	if err := h.repo.Delete(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete governance policy"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "governance policy deleted"})
}

func (h *GovernancePolicyHandler) Evaluate(c *gin.Context) {
	userID := c.GetString("userId")
	var req models.RBACEvaluationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid evaluation request"})
		return
	}

	res, err := h.rbacEngine.Evaluate(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to evaluate governance policy: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}
