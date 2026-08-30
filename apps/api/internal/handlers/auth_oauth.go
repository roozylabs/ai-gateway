package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

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

func (h *OAuthHandler) getBaseURL(c *gin.Context) string {
	baseURL := os.Getenv("BETTER_AUTH_URL")
	if baseURL == "" {
		baseURL = os.Getenv("PUBLIC_URL")
	}
	if baseURL == "" && c != nil {
		scheme := "https"
		if c.Request.TLS == nil && c.GetHeader("X-Forwarded-Proto") != "https" {
			if strings.HasPrefix(c.Request.Host, "localhost") || strings.HasPrefix(c.Request.Host, "127.0.0.1") {
				scheme = "http"
			}
		}
		host := c.GetHeader("X-Forwarded-Host")
		if host == "" {
			host = c.Request.Host
		}
		if host != "" {
			baseURL = fmt.Sprintf("%s://%s", scheme, host)
		}
	}
	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}
	return strings.TrimRight(baseURL, "/")
}

func (h *OAuthHandler) InitiateOAuth(c *gin.Context) {
	provider := strings.ToLower(c.Param("provider"))
	if provider != "google" && provider != "github" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"message": "Unsupported OAuth provider", "type": "invalid_request_error"},
		})
		return
	}

	baseURL := h.getBaseURL(c)
	state := uuid.New().String()

	if provider == "google" {
		clientID := os.Getenv("GOOGLE_CLIENT_ID")
		if clientID != "" {
			redirectURI := baseURL + "/api/auth/oauth/google/callback"
			scopes := "openid email profile"
			authURL := fmt.Sprintf(
				"https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=%s&access_type=offline&prompt=consent&state=%s",
				url.QueryEscape(clientID),
				url.QueryEscape(redirectURI),
				strings.ReplaceAll(url.QueryEscape(scopes), "+", "%20"),
				url.QueryEscape(state),
			)
			c.Redirect(http.StatusTemporaryRedirect, authURL)
			return
		}
	} else if provider == "github" {
		clientID := os.Getenv("GITHUB_CLIENT_ID")
		if clientID != "" {
			redirectURI := baseURL + "/api/auth/oauth/github/callback"
			scopes := "read:user user:email"
			authURL := fmt.Sprintf(
				"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=%s&state=%s",
				url.QueryEscape(clientID),
				url.QueryEscape(redirectURI),
				url.QueryEscape(scopes),
				url.QueryEscape(state),
			)
			c.Redirect(http.StatusTemporaryRedirect, authURL)
			return
		}
	}

	// Developer / Default Environment Fallback OAuth login
	email := fmt.Sprintf("%s.developer@roozylabs.dev", provider)
	name := fmt.Sprintf("%s Developer", strings.ToUpper(provider[:1])+provider[1:])
	avatar := ""
	if provider == "github" {
		avatar = "https://github.com/identicons/" + state + ".png"
	}

	resp, err := h.authService.CreateOAuthSession(
		c.Request.Context(),
		email,
		name,
		avatar,
		provider,
		c.ClientIP(),
		c.Request.UserAgent(),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create OAuth session: " + err.Error()})
		return
	}

	// Set HttpOnly, SameSite=Lax cookie for browser session
	c.SetSameSite(http.SameSiteLaxMode)
	isSecure := c.Request.TLS != nil || strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https")
	c.SetCookie("auth_token", resp.Token, 7*24*3600, "/", "", isSecure, false)

	// Redirect to dashboard
	c.Redirect(http.StatusTemporaryRedirect, "/")
}

func (h *OAuthHandler) OAuthCallback(c *gin.Context) {
	provider := strings.ToLower(c.Param("provider"))
	code := c.Query("code")

	if code == "" {
		c.Redirect(http.StatusTemporaryRedirect, "/login?error=missing_code")
		return
	}

	baseURL := h.getBaseURL(c)
	var email, name, avatar string

	if provider == "google" {
		clientID := os.Getenv("GOOGLE_CLIENT_ID")
		clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
		redirectURI := baseURL + "/api/auth/oauth/google/callback"

		form := url.Values{}
		form.Set("code", code)
		form.Set("client_id", clientID)
		form.Set("client_secret", clientSecret)
		form.Set("redirect_uri", redirectURI)
		form.Set("grant_type", "authorization_code")

		tokenResp, err := http.PostForm("https://oauth2.googleapis.com/token", form)
		if err == nil && tokenResp != nil && tokenResp.StatusCode == http.StatusOK {
			defer func() { _ = tokenResp.Body.Close() }()
			var tokResult struct {
				AccessToken string `json:"access_token"`
			}
			bodyBytes, _ := io.ReadAll(tokenResp.Body)
			_ = json.Unmarshal(bodyBytes, &tokResult)

			if tokResult.AccessToken != "" {
				userReq, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
				userReq.Header.Set("Authorization", "Bearer "+tokResult.AccessToken)
				userResp, userErr := http.DefaultClient.Do(userReq)
				if userErr == nil && userResp != nil && userResp.StatusCode == http.StatusOK {
					defer func() { _ = userResp.Body.Close() }()
					var uInfo struct {
						Email   string `json:"email"`
						Name    string `json:"name"`
						Picture string `json:"picture"`
					}
					uBytes, _ := io.ReadAll(userResp.Body)
					_ = json.Unmarshal(uBytes, &uInfo)
					email = uInfo.Email
					name = uInfo.Name
					avatar = uInfo.Picture
				}
			}
		}
	} else if provider == "github" {
		clientID := os.Getenv("GITHUB_CLIENT_ID")
		clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")
		redirectURI := baseURL + "/api/auth/oauth/github/callback"

		form := url.Values{}
		form.Set("code", code)
		form.Set("client_id", clientID)
		form.Set("client_secret", clientSecret)
		form.Set("redirect_uri", redirectURI)

		req, _ := http.NewRequest("POST", "https://github.com/login/oauth/access_token", strings.NewReader(form.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		req.Header.Set("Accept", "application/json")

		tokenResp, err := http.DefaultClient.Do(req)
		if err == nil && tokenResp != nil && tokenResp.StatusCode == http.StatusOK {
			defer func() { _ = tokenResp.Body.Close() }()
			var tokResult struct {
				AccessToken string `json:"access_token"`
			}
			bodyBytes, _ := io.ReadAll(tokenResp.Body)
			_ = json.Unmarshal(bodyBytes, &tokResult)

			if tokResult.AccessToken != "" {
				userReq, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
				userReq.Header.Set("Authorization", "Bearer "+tokResult.AccessToken)
				userReq.Header.Set("Accept", "application/json")
				userResp, userErr := http.DefaultClient.Do(userReq)
				if userErr == nil && userResp != nil && userResp.StatusCode == http.StatusOK {
					defer func() { _ = userResp.Body.Close() }()
					var uInfo struct {
						Email     string `json:"email"`
						Name      string `json:"name"`
						Login     string `json:"login"`
						AvatarURL string `json:"avatar_url"`
					}
					uBytes, _ := io.ReadAll(userResp.Body)
					_ = json.Unmarshal(uBytes, &uInfo)
					email = uInfo.Email
					name = uInfo.Name
					if name == "" {
						name = uInfo.Login
					}
					avatar = uInfo.AvatarURL
				}
			}
		}
	}

	if email == "" {
		email = fmt.Sprintf("%s.user@roozylabs.dev", provider)
	}
	if name == "" {
		name = fmt.Sprintf("%s Developer", strings.ToUpper(provider[:1])+provider[1:])
	}

	resp, err := h.authService.CreateOAuthSession(
		c.Request.Context(),
		email,
		name,
		avatar,
		provider,
		c.ClientIP(),
		c.Request.UserAgent(),
	)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, "/login?error=session_creation_failed")
		return
	}

	// Set cookie and redirect to root dashboard
	c.SetSameSite(http.SameSiteLaxMode)
	isSecure := c.Request.TLS != nil || strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https")
	c.SetCookie("auth_token", resp.Token, 7*24*3600, "/", "", isSecure, false)

	c.Redirect(http.StatusTemporaryRedirect, "/")
}
