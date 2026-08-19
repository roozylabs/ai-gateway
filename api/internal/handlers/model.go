package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/models"
	"github.com/roozylabs/ai-gateway/internal/repository"
)

type ModelHandler struct {
	models    *repository.ModelRepository
	providers *repository.ProviderRepository
}

func NewModelHandler(models *repository.ModelRepository, providers *repository.ProviderRepository) *ModelHandler {
	return &ModelHandler{models: models, providers: providers}
}

// List godoc
// @Summary      List models
// @Description  Get all models for a provider
// @Tags         models
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Success      200 {array} models.Model
// @Failure      500 {object} map[string]string
// @Router       /api/providers/{id}/models [get]
func (h *ModelHandler) List(c *gin.Context) {
	providerID := c.Param("id")
	search := c.Query("search")

	limit := 10
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	} else if l := c.Query("pageSize"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}

	page := 1
	if p := c.Query("page"); p != "" {
		if n, err := strconv.Atoi(p); err == nil && n > 0 {
			page = n
		}
	}

	offset := (page - 1) * limit

	modelList, total, err := h.models.ListWithFilter(c.Request.Context(), providerID, search, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list models"})
		return
	}
	if modelList == nil {
		modelList = []models.Model{}
	}
	c.JSON(http.StatusOK, gin.H{
		"data":     modelList,
		"total":    total,
		"page":     page,
		"pageSize": limit,
	})
}

// Get godoc
// @Summary      Get model
// @Description  Get a model by ID
// @Tags         models
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Param        modelId path string true "Model ID"
// @Success      200 {object} models.Model
// @Failure      404 {object} map[string]string
// @Router       /api/providers/{id}/models/{modelId} [get]
func (h *ModelHandler) Get(c *gin.Context) {
	modelID := c.Param("modelId")
	m, err := h.models.FindByID(c.Request.Context(), modelID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "model not found"})
		return
	}
	c.JSON(http.StatusOK, m)
}

// Create godoc
// @Summary      Create model
// @Description  Create a new model for a provider
// @Tags         models
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Param        request body models.Model true "Model data"
// @Success      201 {object} models.Model
// @Failure      400 {object} map[string]string
// @Router       /api/providers/{id}/models [post]
func (h *ModelHandler) Create(c *gin.Context) {
	providerID := c.Param("id")
	var m models.Model
	if err := c.ShouldBindJSON(&m); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	m.ProviderID = providerID

	if err := h.models.Create(c.Request.Context(), &m); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create model"})
		return
	}
	c.JSON(http.StatusCreated, m)
}

// Update godoc
// @Summary      Update model
// @Description  Update a model
// @Tags         models
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Param        modelId path string true "Model ID"
// @Param        request body models.Model true "Model data"
// @Success      200 {object} models.Model
// @Failure      400 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Router       /api/providers/{id}/models/{modelId} [put]
func (h *ModelHandler) Update(c *gin.Context) {
	modelID := c.Param("modelId")
	existing, err := h.models.FindByID(c.Request.Context(), modelID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "model not found"})
		return
	}

	if err := c.ShouldBindJSON(existing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if err := h.models.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update model"})
		return
	}
	c.JSON(http.StatusOK, existing)
}

// Delete godoc
// @Summary      Delete model
// @Description  Delete a model
// @Tags         models
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Param        modelId path string true "Model ID"
// @Success      204
// @Failure      404 {object} map[string]string
// @Router       /api/providers/{id}/models/{modelId} [delete]
func (h *ModelHandler) Delete(c *gin.Context) {
	modelID := c.Param("modelId")
	if err := h.models.Delete(c.Request.Context(), modelID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "model not found"})
		return
	}
	c.Status(http.StatusNoContent)
}
