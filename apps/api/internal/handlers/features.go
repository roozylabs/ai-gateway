package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/featureflags"
)

type FeaturesHandler struct {
	manager *featureflags.Manager
}

func NewFeaturesHandler() *FeaturesHandler {
	return &FeaturesHandler{
		manager: featureflags.GetManager(),
	}
}

type FeaturesResponse struct {
	Version  string          `json:"version"`
	PlanTier string          `json:"planTier"`
	Flags    map[string]bool `json:"flags"`
}

// GetFeatures returns the active feature flags for the current organization / plan tier.
// @Summary      Get Active Feature Flags
// @Description  Returns resolved feature flag states evaluated against environment variables and tenant plan tier.
// @Tags         Features
// @Produce      json
// @Success      200 {object} FeaturesResponse
// @Router       /features [get]
func (h *FeaturesHandler) GetFeatures(c *gin.Context) {
	planTier := c.GetString("plan_tier")
	if planTier == "" {
		planTier = c.DefaultQuery("plan_tier", "free")
	}

	flags := h.manager.GetAll(planTier)

	c.JSON(http.StatusOK, FeaturesResponse{
		Version:  "0.2.2",
		PlanTier: planTier,
		Flags:    flags,
	})
}
