package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/models"
	"github.com/roozylabs/ai-gateway/internal/repository"
)

type RoutingPolicyHandler struct {
	policyRepo *repository.RoutingPolicyRepository
}

func NewRoutingPolicyHandler(policyRepo *repository.RoutingPolicyRepository) *RoutingPolicyHandler {
	return &RoutingPolicyHandler{policyRepo: policyRepo}
}

func (h *RoutingPolicyHandler) List(c *gin.Context) {
	userID := c.GetString("userId")
	policies, err := h.policyRepo.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list policies"})
		return
	}
	if policies == nil {
		policies = []models.RoutingPolicy{}
	}
	c.JSON(http.StatusOK, policies)
}

func (h *RoutingPolicyHandler) Get(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	policy, err := h.policyRepo.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "policy not found"})
		return
	}
	c.JSON(http.StatusOK, policy)
}

type CreatePolicyRequest struct {
	Name        string             `json:"name" binding:"required"`
	Weights     map[string]float64 `json:"weights"`
	Constraints map[string]float64 `json:"constraints"`
}

func (h *RoutingPolicyHandler) Create(c *gin.Context) {
	userID := c.GetString("userId")
	var req CreatePolicyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Weights == nil {
		req.Weights = map[string]float64{"task_match": 0.35, "quality": 0.35, "cost": 0.15, "speed": 0.15}
	}
	if req.Constraints == nil {
		req.Constraints = map[string]float64{"max_cost_per_request": 0.05}
	}
	policy := &models.RoutingPolicy{
		UserID:      userID,
		Name:        req.Name,
		Weights:     req.Weights,
		Constraints: req.Constraints,
		Enabled:     true,
	}
	if err := h.policyRepo.Create(c.Request.Context(), policy); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create policy"})
		return
	}
	c.JSON(http.StatusCreated, policy)
}

type UpdatePolicyRequest struct {
	Name        *string            `json:"name"`
	Weights     map[string]float64 `json:"weights"`
	Constraints map[string]float64 `json:"constraints"`
	Enabled     *bool              `json:"enabled"`
}

func (h *RoutingPolicyHandler) Update(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	existing, err := h.policyRepo.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "policy not found"})
		return
	}
	var req UpdatePolicyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.Weights != nil {
		existing.Weights = req.Weights
	}
	if req.Constraints != nil {
		existing.Constraints = req.Constraints
	}
	if req.Enabled != nil {
		existing.Enabled = *req.Enabled
	}
	if err := h.policyRepo.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update policy"})
		return
	}
	c.JSON(http.StatusOK, existing)
}

func (h *RoutingPolicyHandler) Delete(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	if err := h.policyRepo.Delete(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete policy"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "policy deleted"})
}

func (h *RoutingPolicyHandler) SetDefault(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	if err := h.policyRepo.SetDefault(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set policy as default"})
		return
	}
	policy, err := h.policyRepo.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "policy set as default"})
		return
	}
	c.JSON(http.StatusOK, policy)
}

func (h *RoutingPolicyHandler) FindByName(c *gin.Context) {
	userID := c.GetString("userId")
	name := c.Param("name")
	policy, err := h.policyRepo.FindByName(c.Request.Context(), name, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "policy not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find policy"})
		}
		return
	}
	c.JSON(http.StatusOK, policy)
}
