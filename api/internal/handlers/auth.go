package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/service"
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

func verifyCloudflareTurnstile(token, secretKey, remoteIP string) (bool, string) {
	secretKey = strings.TrimSpace(secretKey)
	secretKey = strings.Trim(secretKey, "\"")
	secretKey = strings.Trim(secretKey, "'")

	token = strings.TrimSpace(token)
	token = strings.Trim(token, "\"")
	token = strings.Trim(token, "'")

	if secretKey == "" || strings.EqualFold(secretKey, "disabled") || strings.EqualFold(secretKey, "none") || secretKey == "1x0000000000000000000000000000000AA" {
		log.Printf("[Turnstile Auth] Bypassing Turnstile (secretKey=%s)", secretKey)
		return true, ""
	}
	if token == "" {
		log.Printf("[Turnstile Auth] Verification failed: turnstile token is empty")
		return false, "Turnstile token is empty. Please complete the captcha."
	}

	formData := url.Values{}
	formData.Set("secret", secretKey)
	formData.Set("response", token)

	resp, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v1/siteverify", formData)
	if err != nil {
		log.Printf("[Turnstile Auth] HTTP PostForm failed: %v", err)
		return false, err.Error()
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var result TurnstileResponse
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		log.Printf("[Turnstile Auth] JSON unmarshal failed: %v, raw: %s", err, string(bodyBytes))
		return false, string(bodyBytes)
	}

	if !result.Success {
		errMsg := fmt.Sprintf("Cloudflare siteverify rejected token. ErrorCodes: %v", result.ErrorCodes)
		log.Printf("[Turnstile Auth] %s", errMsg)
		return false, errMsg
	}

	log.Printf("[Turnstile Auth] Verification SUCCESS!")
	return true, ""
}

func (h *AuthHandler) GetTurnstileConfig(c *gin.Context) {
	siteKey := os.Getenv("NEXT_PUBLIC_CLOUDFLARE_SITE_KEY")
	if siteKey == "" {
		siteKey = os.Getenv("CLOUDFLARE_SITE_KEY")
	}
	siteKey = strings.TrimSpace(siteKey)
	siteKey = strings.Trim(siteKey, "\"")
	siteKey = strings.Trim(siteKey, "'")
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
		if ok, detail := verifyCloudflareTurnstile(req.TurnstileToken, secretKey, c.ClientIP()); !ok {
			c.JSON(http.StatusForbidden, gin.H{
				"error":  "Security verification failed (Cloudflare Turnstile)",
				"detail": detail,
			})
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
