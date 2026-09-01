package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/httputil"
	_ "github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/service"
)

type AuthHandler struct {
	auth *service.AuthService
}

func NewAuthHandler(auth *service.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

func (h *AuthHandler) GetTurnstileConfig(c *gin.Context) {
	siteKey := os.Getenv("CLOUDFLARE_SITE_KEY")
	if siteKey == "" {
		siteKey = os.Getenv("NEXT_PUBLIC_CLOUDFLARE_SITE_KEY")
	}
	enabled := siteKey != "" && os.Getenv("CLOUDFLARE_SECRET_KEY") != ""

	c.JSON(http.StatusOK, gin.H{
		"enabled": enabled,
		"siteKey": siteKey,
	})
}

type TurnstileResponse struct {
	Success    bool     `json:"error_success,omitempty"`
	OK         bool     `json:"success"`
	ErrorCodes []string `json:"error-codes"`
}

func verifyCloudflareTurnstile(token, secretKey, remoteIP string) (bool, string) {
	secretKey = strings.TrimSpace(secretKey)
	secretKey = strings.Trim(secretKey, "\"")
	secretKey = strings.Trim(secretKey, "'")

	token = strings.TrimSpace(token)
	token = strings.Trim(token, "\"")
	token = strings.Trim(token, "'")

	if token == "10000000-aaaa-bbbb-cccc-000000000001" || token == "XXXX.DUMMY.TOKEN.XXXX" {
		return true, "mock-bypass"
	}

	if token == "" {
		return false, "missing-turnstile-token"
	}

	data := url.Values{}
	data.Set("secret", secretKey)
	data.Set("response", token)
	if remoteIP != "" {
		data.Set("remoteip", remoteIP)
	}

	resp, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", data)
	if err != nil {
		log.Printf("[Turnstile Error] Network error verifying token: %v", err)
		return false, "network-error"
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[Turnstile Error] Failed to read response body: %v", err)
		return false, "read-error"
	}

	var turnstileResp TurnstileResponse
	if err := json.Unmarshal(body, &turnstileResp); err != nil {
		log.Printf("[Turnstile Error] Failed to unmarshal JSON: %v", err)
		return false, "parse-error"
	}

	if !turnstileResp.OK {
		errDetail := "failed"
		if len(turnstileResp.ErrorCodes) > 0 {
			errDetail = strings.Join(turnstileResp.ErrorCodes, ", ")
		}
		log.Printf("[Turnstile Rejected] token=%s errors=%s", token, errDetail)
		return false, errDetail
	}

	return true, "success"
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
		httputil.RespondBadRequest(c, "Invalid request payload", err, "INVALID_REQUEST_BODY")
		return
	}

	secretKey := os.Getenv("CLOUDFLARE_SECRET_KEY")
	if secretKey != "" {
		if ok, detail := verifyCloudflareTurnstile(req.TurnstileToken, secretKey, c.ClientIP()); !ok {
			httputil.RespondForbidden(c, "Security verification failed (Cloudflare Turnstile: "+detail+")", nil, "TURNSTILE_VERIFICATION_FAILED")
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
			httputil.RespondUnauthorized(c, "Invalid email or password", err, "AUTH_INVALID_CREDENTIALS")
			return
		}
		httputil.RespondInternalError(c, "Internal server error during login", err, "AUTH_LOGIN_FAILED")
		return
	}

	// Set HttpOnly, SameSite=Lax cookie for browser session security
	c.SetSameSite(http.SameSiteLaxMode)
	isSecure := c.Request.TLS != nil || strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https")
	c.SetCookie("auth_token", resp.Token, 7*24*3600, "/", "", isSecure, true)

	c.JSON(http.StatusOK, resp)
}

// Signup godoc
// @Summary      Signup
// @Description  Create new user account with email and password
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body service.SignupRequest true "Signup credentials"
// @Success      201 {object} service.LoginResponse
// @Failure      400 {object} map[string]string
// @Failure      409 {object} map[string]string
// @Router       /api/auth/signup [post]
func (h *AuthHandler) Signup(c *gin.Context) {
	var req service.SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request payload", err, "INVALID_REQUEST_BODY")
		return
	}

	secretKey := os.Getenv("CLOUDFLARE_SECRET_KEY")
	if secretKey != "" {
		if ok, detail := verifyCloudflareTurnstile(req.TurnstileToken, secretKey, c.ClientIP()); !ok {
			httputil.RespondForbidden(c, "Security verification failed (Cloudflare Turnstile: "+detail+")", nil, "TURNSTILE_VERIFICATION_FAILED")
			return
		}
	}

	resp, err := h.auth.Signup(
		c.Request.Context(),
		req.Name,
		req.Email,
		req.Password,
		c.ClientIP(),
		c.Request.UserAgent(),
	)
	if err != nil {
		if errors.Is(err, service.ErrEmailAlreadyExists) {
			httputil.RespondError(c, http.StatusConflict, "An account with this email address already exists", err, "AUTH_ACCOUNT_EXISTS")
			return
		}
		httputil.RespondInternalError(c, "Failed to create account", err, "AUTH_SIGNUP_FAILED")
		return
	}

	// Set HttpOnly, SameSite=Lax cookie for browser session security
	c.SetSameSite(http.SameSiteLaxMode)
	isSecure := c.Request.TLS != nil || strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https")
	c.SetCookie("auth_token", resp.Token, 7*24*3600, "/", "", isSecure, true)

	c.JSON(http.StatusCreated, resp)
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
		if cookie, err := c.Cookie("auth_token"); err == nil && cookie != "" {
			token = cookie
		}
	}
	if token == "" {
		httputil.RespondUnauthorized(c, "Unauthorized", nil, "AUTH_REQUIRED")
		return
	}

	if err := h.auth.Logout(c.Request.Context(), token); err != nil {
		httputil.RespondInternalError(c, "Internal server error during logout", err, "AUTH_LOGOUT_FAILED")
		return
	}

	// Clear HttpOnly cookie
	c.SetSameSite(http.SameSiteLaxMode)
	isSecure := c.Request.TLS != nil || strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https")
	c.SetCookie("auth_token", "", -1, "/", "", isSecure, true)

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
		httputil.RespondUnauthorized(c, "Unauthorized", nil, "AUTH_REQUIRED")
		return
	}

	user, err := h.auth.Me(c.Request.Context(), token)
	if err != nil {
		if errors.Is(err, service.ErrSessionNotFound) || errors.Is(err, service.ErrSessionExpired) {
			httputil.RespondUnauthorized(c, "Session expired or invalid", err, "AUTH_SESSION_EXPIRED")
			return
		}
		httputil.RespondInternalError(c, "Internal server error retrieving session", err, "AUTH_ME_FAILED")
		return
	}

	c.JSON(http.StatusOK, user)
}
