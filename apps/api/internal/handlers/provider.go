package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/repository"
)

type ProviderHandler struct {
	providers   *repository.ProviderRepository
	gatewayKeys *repository.GatewayKeyRepository
}

func NewProviderHandler(providers *repository.ProviderRepository, gatewayKeys *repository.GatewayKeyRepository) *ProviderHandler {
	return &ProviderHandler{
		providers:   providers,
		gatewayKeys: gatewayKeys,
	}
}

// List godoc
// @Summary      List providers
// @Description  Get all providers for the current user
// @Tags         providers
// @Security     BearerAuth
// @Success      200 {array} models.Provider
// @Failure      500 {object} map[string]string
// @Router       /api/providers [get]
func (h *ProviderHandler) List(c *gin.Context) {
	userID := c.GetString("userId")
	providers, err := h.providers.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list providers"})
		return
	}
	if providers == nil {
		providers = []models.Provider{}
	}
	c.JSON(http.StatusOK, providers)
}

// Get godoc
// @Summary      Get provider
// @Description  Get a provider by ID
// @Tags         providers
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Success      200 {object} models.Provider
// @Failure      404 {object} map[string]string
// @Router       /api/providers/{id} [get]
func (h *ProviderHandler) Get(c *gin.Context) {
	id := c.Param("id")
	provider, err := h.providers.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "provider not found"})
		return
	}
	c.JSON(http.StatusOK, provider)
}

// Create godoc
// @Summary      Create provider
// @Description  Create a new provider
// @Tags         providers
// @Security     BearerAuth
// @Param        request body models.Provider true "Provider data"
// @Success      201 {object} models.Provider
// @Failure      400 {object} map[string]string
// @Router       /api/providers [post]
func (h *ProviderHandler) Create(c *gin.Context) {
	var p models.Provider
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	p.UserID = c.GetString("userId")

	if err := h.providers.Create(c.Request.Context(), &p); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create provider"})
		return
	}
	c.JSON(http.StatusCreated, p)
}

// Update godoc
// @Summary      Update provider
// @Description  Update a provider
// @Tags         providers
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Param        request body models.Provider true "Provider data"
// @Success      200 {object} models.Provider
// @Failure      400 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Router       /api/providers/{id} [put]
func (h *ProviderHandler) Update(c *gin.Context) {
	id := c.Param("id")
	existing, err := h.providers.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "provider not found"})
		return
	}

	if err := c.ShouldBindJSON(existing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if err := h.providers.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update provider"})
		return
	}
	c.JSON(http.StatusOK, existing)
}

// Delete godoc
// @Summary      Delete provider
// @Description  Delete a provider
// @Tags         providers
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Success      204
// @Failure      404 {object} map[string]string
// @Failure      409 {object} map[string]string
// @Router       /api/providers/{id} [delete]
func (h *ProviderHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	// Guard against deleting provider that has active Gateway API Keys
	if h.gatewayKeys != nil {
		count, err := h.gatewayKeys.CountByProviderID(c.Request.Context(), id)
		if err == nil && count > 0 {
			c.JSON(http.StatusConflict, gin.H{
				"error": fmt.Sprintf("Cannot delete provider: %d active Gateway API Key(s) are bound to it. Please revoke or reassign the keys first.", count),
			})
			return
		}
	}

	if err := h.providers.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "provider not found"})
		return
	}
	c.Status(http.StatusNoContent)
}
