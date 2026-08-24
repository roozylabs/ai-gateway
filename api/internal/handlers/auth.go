package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/service"
)

type AuthHandler struct {
	auth *service.AuthService
}

func NewAuthHandler(auth *service.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

type TurnstileResponse struct {
	Success    bool     `json:"success"`
	ErrorCodes []string `json:"error-codes"`
}

func verifyCloudflareTurnstile(token, secretKey, remoteIP string) bool {
	if secretKey == "" {
		return true
	}
	if token == "" {
		return false
	}
	resp, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v1/siteverify",
		url.Values{
			"secret":   {secretKey},
			"response": {token},
		})
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	var result TurnstileResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false
	}
	return result.Success
}

func (h *AuthHandler) GetTurnstileConfig(c *gin.Context) {
	siteKey := os.Getenv("NEXT_PUBLIC_CLOUDFLARE_SITE_KEY")
	if siteKey == "" {
		siteKey = os.Getenv("CLOUDFLARE_SITE_KEY")
	}
	c.JSON(http.StatusOK, gin.H{
		"siteKey": siteKey,
	})
}

// Login godoc
// @Summary      Login
// @Description  Authenticate user with email and password
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body service.LoginRequest true "Login credentials"
// @Success      200 {object} service.LoginResponse
// @Failure      401 {object} map[string]string
// @Router       /api/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req service.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	secretKey := os.Getenv("CLOUDFLARE_SECRET_KEY")
	if secretKey != "" {
		if !verifyCloudflareTurnstile(req.TurnstileToken, secretKey, c.ClientIP()) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Security verification failed (Cloudflare Turnstile)"})
			return
		}
	}

	resp, err := h.auth.Login(
		c.Request.Context(),
		req.Email,
		req.Password,
		c.ClientIP(),
		c.Request.UserAgent(),
	)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// Logout godoc
// @Summary      Logout
// @Description  Invalidate session token
// @Tags         auth
// @Security     BearerAuth
// @Success      200 {object} map[string]string
// @Failure      401 {object} map[string]string
// @Router       /api/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	token := c.GetString("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if err := h.auth.Logout(c.Request.Context(), token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

// Me godoc
// @Summary      Get current user
// @Description  Get the currently authenticated user
// @Tags         auth
// @Security     BearerAuth
// @Success      200 {object} models.User
// @Failure      401 {object} map[string]string
// @Router       /api/auth/me [get]
func (h *AuthHandler) Me(c *gin.Context) {
	token := c.GetString("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.auth.Me(c.Request.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) || errors.Is(err, service.ErrSessionExpired) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, user)
}
