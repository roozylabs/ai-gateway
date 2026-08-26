package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/roozylabs/prism/internal/service"
)

type OAuthHandler struct {
	authService *service.AuthService
}

func NewOAuthHandler(authService *service.AuthService) *OAuthHandler {
	return &OAuthHandler{authService: authService}
}

func (h *OAuthHandler) InitiateOAuth(c *gin.Context) {
	provider := c.Param("provider")
	if provider != "google" && provider != "github" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"message": "Unsupported OAuth provider", "type": "invalid_request_error"},
		})
		return
	}

	state := uuid.New().String()
	redirectURL := "/auth/callback?provider=" + provider + "&state=" + state

	c.JSON(http.StatusOK, gin.H{
		"provider":    provider,
		"state":       state,
		"redirectUrl": redirectURL,
	})
}

func (h *OAuthHandler) OAuthCallback(c *gin.Context) {
	provider := c.Param("provider")
	code := c.Query("code")

	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"message": "Missing authorization code", "type": "invalid_request_error"},
		})
		return
	}

	// Simulated OAuth user token generation
	token := "token_oauth_" + provider + "_" + uuid.New().String()[:12]

	c.JSON(http.StatusOK, gin.H{
		"message":     "OAuth authentication successful",
		"provider":    provider,
		"accessToken": token,
		"isOnboarded": true,
	})
}
