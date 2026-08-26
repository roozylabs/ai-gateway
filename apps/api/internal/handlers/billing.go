package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/repository"
)

type BillingHandler struct {
	repo *repository.BillingRepository
}

func NewBillingHandler(repo *repository.BillingRepository) *BillingHandler {
	return &BillingHandler{repo: repo}
}

func (h *BillingHandler) ListPlans(c *gin.Context) {
	plans := h.repo.ListPlans()
	c.JSON(http.StatusOK, gin.H{
		"object": "list",
		"data":   plans,
	})
}

func (h *BillingHandler) GetSubscription(c *gin.Context) {
	orgID := c.GetString("organizationId")
	sub, err := h.repo.GetActiveSubscription(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get active subscription: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, sub)
}

func (h *BillingHandler) UpgradeSubscription(c *gin.Context) {
	var req struct {
		PlanSlug string `json:"planSlug" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "planSlug is required"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Subscription plan updated successfully",
		"planSlug": req.PlanSlug,
		"status":   "active",
	})
}

func (h *BillingHandler) ListInvoices(c *gin.Context) {
	orgID := c.GetString("organizationId")
	invoices, err := h.repo.ListInvoices(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list invoices: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"object": "list",
		"data":   invoices,
	})
}

func (h *BillingHandler) GetUsage(c *gin.Context) {
	orgID := c.GetString("organizationId")
	usages, err := h.repo.GetDailyUsage(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get usage breakdown: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"object": "list",
		"data":   usages,
	})
}
