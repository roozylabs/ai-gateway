package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/repository"
)

type OnboardingHandler struct {
	userRepo *repository.UserRepository
	keyRepo  *repository.GatewayKeyRepository
}

func NewOnboardingHandler(userRepo *repository.UserRepository, keyRepo *repository.GatewayKeyRepository) *OnboardingHandler {
	return &OnboardingHandler{
		userRepo: userRepo,
		keyRepo:  keyRepo,
	}
}

type OnboardingRequest struct {
	WorkspaceName string `json:"workspaceName" binding:"required"`
	PrimaryRole   string `json:"primaryRole"` // developer, agent_manager, finops_manager, auditor
}

func (h *OnboardingHandler) Complete(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{"message": "Unauthorized", "type": "auth_error"},
		})
		return
	}

	var req OnboardingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"message": "Invalid onboarding request: " + err.Error(), "type": "invalid_request_error"},
		})
		return
	}

	if req.PrimaryRole == "" {
		req.PrimaryRole = "developer"
	}

	// Create initial Gateway API key for the onboarded user
	keyVal := "gw_sk_live_" + uuid.New().String()[:24]
	gwKey := &models.GatewayAPIKey{
		ID:        uuid.New().String(),
		UserID:    userID,
		Name:      req.WorkspaceName + " Default Key",
		KeyHash:   keyVal,
		KeyPrefix: keyVal[:14],
		Enabled:   true,
		RateLimit: 600,
	}

	if err := h.keyRepo.Create(c.Request.Context(), gwKey); err != nil {
		// Non-fatal if key creation fails
		_ = err
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Onboarding completed successfully",
		"workspaceName": req.WorkspaceName,
		"primaryRole":   req.PrimaryRole,
		"apiKey":        keyVal,
	})
}
