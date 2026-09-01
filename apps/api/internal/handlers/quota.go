package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/httputil"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/repository"
)

type QuotaHandler struct {
	repo *repository.QuotaRepository
}

func NewQuotaHandler(repo *repository.QuotaRepository) *QuotaHandler {
	return &QuotaHandler{repo: repo}
}

func (h *QuotaHandler) List(c *gin.Context) {
	orgID := c.GetString("organizationId")
	if orgID == "" {
		orgID = c.GetString("organization_id")
	}
	quotas, err := h.repo.ListQuotas(c.Request.Context(), orgID)
	if err != nil {
		httputil.RespondInternalError(c, "Failed to list quotas", err, "QUOTAS_LIST_FAILED")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"object": "list",
		"data":   quotas,
	})
}

func (h *QuotaHandler) Get(c *gin.Context) {
	targetType := c.Param("target_type")
	targetID := c.Param("target_id")

	evalResult, err := h.repo.EvaluateQuota(c.Request.Context(), targetType, targetID)
	if err != nil {
		httputil.RespondInternalError(c, "Failed to evaluate quota", err, "QUOTA_EVALUATION_FAILED")
		return
	}

	quotaConfig, _ := h.repo.GetQuotaByTarget(c.Request.Context(), targetType, targetID)

	c.JSON(http.StatusOK, gin.H{
		"quota":      quotaConfig,
		"evaluation": evalResult,
	})
}

func (h *QuotaHandler) Update(c *gin.Context) {
	orgID := c.GetString("organizationId")
	if orgID == "" {
		orgID = c.GetString("organization_id")
	}
	targetType := c.Param("target_type")
	targetID := c.Param("target_id")

	var req struct {
		MonthlySpendLimitUSD float64 `json:"monthlySpendLimitUsd"`
		DailySpendLimitUSD   float64 `json:"dailySpendLimitUsd"`
		DailyRequestLimit    int     `json:"dailyRequestLimit"`
		MaxConcurrentStreams int     `json:"maxConcurrentStreams"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid quota update payload", err, "INVALID_REQUEST_BODY")
		return
	}

	if targetType == "organization" && orgID != "" && targetID != orgID {
		httputil.RespondForbidden(c, "cannot update quota for a different organization", nil, "QUOTA_ACCESS_DENIED")
		return
	}

	orgIDStr := orgID
	quota := &models.TenantQuota{
		OrganizationID:       &orgIDStr,
		TargetType:           targetType,
		TargetID:             targetID,
		MonthlySpendLimitUSD: req.MonthlySpendLimitUSD,
		DailySpendLimitUSD:   req.DailySpendLimitUSD,
		DailyRequestLimit:    req.DailyRequestLimit,
		MaxConcurrentStreams: req.MaxConcurrentStreams,
	}

	if err := h.repo.UpsertQuota(c.Request.Context(), quota); err != nil {
		httputil.RespondInternalError(c, "Failed to update tenant quota", err, "QUOTA_UPDATE_FAILED")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Tenant quota updated successfully",
		"quota":   quota,
	})
}
