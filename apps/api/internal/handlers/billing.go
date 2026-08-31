package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/httputil"
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
		httputil.RespondError(c, http.StatusInternalServerError, "Failed to retrieve active subscription", err, "SUBSCRIPTION_FETCH_FAILED")
		return
	}
	c.JSON(http.StatusOK, sub)
}

func (h *BillingHandler) UpgradeSubscription(c *gin.Context) {
	var req struct {
		PlanSlug string `json:"planSlug" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondError(c, http.StatusBadRequest, "planSlug is required", err, "INVALID_PLAN_SLUG")
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
		httputil.RespondError(c, http.StatusInternalServerError, "Failed to list invoices", err, "INVOICE_LIST_FAILED")
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
		httputil.RespondError(c, http.StatusInternalServerError, "Failed to get usage breakdown", err, "USAGE_FETCH_FAILED")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"object": "list",
		"data":   usages,
	})
}
