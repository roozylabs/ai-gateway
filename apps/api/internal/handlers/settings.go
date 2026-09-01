package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/httputil"
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
		httputil.RespondInternalError(c, "Failed to list settings", err, "SETTINGS_LIST_FAILED")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"value": settings,
	})
}

func (h *SettingsHandler) Update(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		httputil.RespondUnauthorized(c, "Unauthorized", nil, "AUTH_REQUIRED")
		return
	}

	var req struct {
		Settings map[string]string `json:"settings" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request payload", err, "INVALID_REQUEST_BODY")
		return
	}

	if err := h.settings.SetMultiple(c.Request.Context(), req.Settings); err != nil {
		httputil.RespondInternalError(c, "Failed to update settings", err, "SETTINGS_UPDATE_FAILED")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "settings updated"})
}
