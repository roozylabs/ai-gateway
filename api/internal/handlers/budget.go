package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/proxy"
	"github.com/roozylabs/prism/internal/repository"
)

type BudgetHandler struct {
	budgetRepo *repository.BudgetRepository
}

func NewBudgetHandler(budgetRepo *repository.BudgetRepository) *BudgetHandler {
	return &BudgetHandler{budgetRepo: budgetRepo}
}

func (h *BudgetHandler) List(c *gin.Context) {
	userID := c.GetString("userId")
	budgets, err := h.budgetRepo.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list budgets"})
		return
	}
	if budgets == nil {
		budgets = []models.Budget{}
	}
	c.JSON(http.StatusOK, budgets)
}

func (h *BudgetHandler) Get(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	budget, err := h.budgetRepo.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "budget not found"})
		return
	}
	c.JSON(http.StatusOK, budget)
}

type CreateBudgetRequest struct {
	Name              string  `json:"name" binding:"required"`
	MonthlyLimit      float64 `json:"monthlyLimit"`
	DailyLimit        float64 `json:"dailyLimit"`
	HardLimit         bool    `json:"hardLimit"`
	WarningThreshold  float64 `json:"warningThreshold"`
	CriticalThreshold float64 `json:"criticalThreshold"`
}

func (h *BudgetHandler) Create(c *gin.Context) {
	userID := c.GetString("userId")
	var req CreateBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.WarningThreshold == 0 {
		req.WarningThreshold = 0.80
	}
	if req.CriticalThreshold == 0 {
		req.CriticalThreshold = 0.90
	}
	budget := &models.Budget{
		UserID:            userID,
		Name:              req.Name,
		MonthlyLimit:      req.MonthlyLimit,
		DailyLimit:        req.DailyLimit,
		HardLimit:         req.HardLimit,
		WarningThreshold:  req.WarningThreshold,
		CriticalThreshold: req.CriticalThreshold,
		Enabled:           true,
	}
	if err := h.budgetRepo.Create(c.Request.Context(), budget); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create budget"})
		return
	}
	c.JSON(http.StatusCreated, budget)
}

type UpdateBudgetRequest struct {
	Name              *string  `json:"name"`
	MonthlyLimit      *float64 `json:"monthlyLimit"`
	DailyLimit        *float64 `json:"dailyLimit"`
	HardLimit         *bool    `json:"hardLimit"`
	WarningThreshold  *float64 `json:"warningThreshold"`
	CriticalThreshold *float64 `json:"criticalThreshold"`
	Enabled           *bool    `json:"enabled"`
}

func (h *BudgetHandler) Update(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	existing, err := h.budgetRepo.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "budget not found"})
		return
	}
	var req UpdateBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.MonthlyLimit != nil {
		existing.MonthlyLimit = *req.MonthlyLimit
	}
	if req.DailyLimit != nil {
		existing.DailyLimit = *req.DailyLimit
	}
	if req.HardLimit != nil {
		existing.HardLimit = *req.HardLimit
	}
	if req.WarningThreshold != nil {
		existing.WarningThreshold = *req.WarningThreshold
	}
	if req.CriticalThreshold != nil {
		existing.CriticalThreshold = *req.CriticalThreshold
	}
	if req.Enabled != nil {
		existing.Enabled = *req.Enabled
	}
	if err := h.budgetRepo.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update budget"})
		return
	}
	c.JSON(http.StatusOK, existing)
}

func (h *BudgetHandler) Delete(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	if err := h.budgetRepo.Delete(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete budget"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "budget deleted"})
}

type BudgetStatusHandler struct {
	budgetMgr *proxy.BudgetManager
}

func NewBudgetStatusHandler(budgetMgr *proxy.BudgetManager) *BudgetStatusHandler {
	return &BudgetStatusHandler{budgetMgr: budgetMgr}
}

func (h *BudgetStatusHandler) GetStatus(c *gin.Context) {
	userID := c.GetString("userId")
	status, err := h.budgetMgr.GetStatus(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get budget status"})
		return
	}
	c.JSON(http.StatusOK, status)
}
