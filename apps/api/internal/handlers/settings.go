package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/repository"
)

type SettingsHandler struct {
	settings *repository.SettingRepository
}

func NewSettingsHandler(settings *repository.SettingRepository) *SettingsHandler {
	return &SettingsHandler{settings: settings}
}

func (h *SettingsHandler) List(c *gin.Context) {
	settings, err := h.settings.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list settings"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"value": settings,
	})
}

func (h *SettingsHandler) Update(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req struct {
		Settings map[string]string `json:"settings" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.settings.SetMultiple(c.Request.Context(), req.Settings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "settings updated"})
}
