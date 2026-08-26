package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/proxy"
	goredis "github.com/roozylabs/prism/internal/redis"
	"github.com/roozylabs/prism/internal/repository"
	"github.com/roozylabs/prism/internal/utils"
)

type CredentialHandler struct {
	credentials   *repository.CredentialRepository
	providers     *repository.ProviderRepository
	gatewayKeys   *repository.GatewayKeyRepository
	cooldownStore *goredis.CooldownStore
	publisher     *goredis.EventPublisher
	encKey        string
}

func NewCredentialHandler(
	credentials *repository.CredentialRepository,
	providers *repository.ProviderRepository,
	gatewayKeys *repository.GatewayKeyRepository,
	cooldownStore *goredis.CooldownStore,
	publisher *goredis.EventPublisher,
	encKey string,
) *CredentialHandler {
	return &CredentialHandler{
		credentials:   credentials,
		providers:     providers,
		gatewayKeys:   gatewayKeys,
		cooldownStore: cooldownStore,
		publisher:     publisher,
		encKey:        encKey,
	}
}

type OAuthMetadataInput struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	RefreshToken string `json:"refreshToken"`
}

type CreateCredentialRequest struct {
	Name     string              `json:"name" binding:"required"`
	AuthType string              `json:"authType"`
	APIKey   string              `json:"apiKey"`
	Metadata *OAuthMetadataInput `json:"metadata"`
	Priority int                 `json:"priority"`
}

// List godoc
// @Summary      List credentials
// @Description  Get all credentials for a provider
// @Tags         credentials
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Success      200 {array} models.Credential
// @Failure      500 {object} map[string]string
// @Router       /api/providers/{id}/credentials [get]
func (h *CredentialHandler) List(c *gin.Context) {
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

	credentials, total, err := h.credentials.ListWithFilter(c.Request.Context(), providerID, search, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list credentials"})
		return
	}
	if credentials == nil {
		credentials = []models.Credential{}
	}

	for i := range credentials {
		credentials[i].Name = maskEmailName(credentials[i].Name)
		h.enrichCredentialQuota(c.Request.Context(), &credentials[i])
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     credentials,
		"total":    total,
		"page":     page,
		"pageSize": limit,
	})
}

// Get godoc
// @Summary      Get credential
// @Description  Get a credential by ID
// @Tags         credentials
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Param        credId path string true "Credential ID"
// @Success      200 {object} models.Credential
// @Failure      404 {object} map[string]string
// @Router       /api/providers/{id}/credentials/{credId} [get]
func (h *CredentialHandler) Get(c *gin.Context) {
	credID := c.Param("credId")
	cred, err := h.credentials.FindByID(c.Request.Context(), credID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "credential not found"})
		return
	}
	h.enrichCredentialQuota(c.Request.Context(), cred)

	c.JSON(http.StatusOK, cred)
}

// Create godoc
// @Summary      Create credential
// @Description  Create a new credential for a provider
// @Tags         credentials
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Param        request body CreateCredentialRequest true "Credential data"
// @Success      201 {object} models.Credential
// @Failure      400 {object} map[string]string
// @Router       /api/providers/{id}/credentials [post]
func (h *CredentialHandler) Create(c *gin.Context) {
	providerID := c.Param("id")

	var req CreateCredentialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	authType := req.AuthType
	if authType == "" {
		authType = "api_key"
	}

	var encrypted string
	var keyPrefix string
	var maskedKey string
	var encMeta sql.NullString

	if authType == "gcp_user_oauth" {
		if req.Metadata == nil || req.Metadata.ClientID == "" || req.Metadata.ClientSecret == "" || req.Metadata.RefreshToken == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "OAuth credentials require clientId, clientSecret, and refreshToken"})
			return
		}
		metaBytes, err := json.Marshal(map[string]string{
			"client_id":     req.Metadata.ClientID,
			"client_secret": req.Metadata.ClientSecret,
			"refresh_token": req.Metadata.RefreshToken,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encode metadata"})
			return
		}
		encryptedMeta, err := utils.EncryptAES256GCM(string(metaBytes), h.encKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encrypt metadata"})
			return
		}
		encMeta = sql.NullString{String: encryptedMeta, Valid: true}
		encrypted, _ = utils.EncryptAES256GCM("oauth_token", h.encKey)

		cid := req.Metadata.ClientID
		if len(cid) > 12 {
			keyPrefix = cid[:12]
		} else {
			keyPrefix = cid
		}
		if len(cid) > 16 {
			maskedKey = cid[:6] + "••••" + cid[len(cid)-4:]
		} else {
			maskedKey = cid + "••••"
		}
	} else {
		if req.APIKey == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "apiKey is required for api_key auth type"})
			return
		}
		var err error
		encrypted, err = utils.EncryptAES256GCM(req.APIKey, h.encKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encrypt key"})
			return
		}
		maskedKey = utils.MaskAPIKey(req.APIKey)
		keyPrefix = req.APIKey
		if len(keyPrefix) > 8 {
			keyPrefix = keyPrefix[:8]
		}
	}

	cred := &models.Credential{
		ProviderID:        providerID,
		Name:              req.Name,
		EncryptedKey:      encrypted,
		KeyPrefix:         keyPrefix,
		MaskedKey:         maskedKey,
		AuthType:          authType,
		EncryptedMetadata: encMeta,
		Priority:          req.Priority,
		Enabled:           true,
		Status:            "active",
	}

	if err := h.credentials.Create(c.Request.Context(), cred); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create credential"})
		return
	}
	c.JSON(http.StatusCreated, cred)
}

func maskEmailName(name string) string {
	if !strings.Contains(name, "@") {
		return name
	}
	parts := strings.SplitN(name, "@", 2)
	user := parts[0]
	domain := parts[1]
	if len(user) <= 2 {
		return user[:1] + "***@" + domain
	}
	return user[:2] + "***" + user[len(user)-1:] + "@" + domain
}

type UpdateCredentialRequest struct {
	Name     string              `json:"name"`
	AuthType string              `json:"authType"`
	APIKey   string              `json:"apiKey"`
	Metadata *OAuthMetadataInput `json:"metadata"`
	Priority int                 `json:"priority"`
	Status   string              `json:"status"`
}

// Update godoc
// @Summary      Update credential
// @Description  Update a credential
// @Tags         credentials
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Param        credId path string true "Credential ID"
// @Param        request body UpdateCredentialRequest true "Credential data"
// @Success      200 {object} models.Credential
// @Failure      400 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Router       /api/providers/{id}/credentials/{credId} [put]
func (h *CredentialHandler) Update(c *gin.Context) {
	credID := c.Param("credId")
	existing, err := h.credentials.FindByID(c.Request.Context(), credID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "credential not found"})
		return
	}

	var req UpdateCredentialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.AuthType != "" {
		existing.AuthType = req.AuthType
	}
	if req.Priority > 0 {
		existing.Priority = req.Priority
	}
	if req.Status != "" {
		existing.Status = req.Status
		switch req.Status {
		case "active":
			existing.Enabled = true
		case "disabled":
			existing.Enabled = false
		}
	}
	if req.Metadata != nil && req.Metadata.ClientID != "" && req.Metadata.ClientSecret != "" && req.Metadata.RefreshToken != "" {
		metaBytes, err := json.Marshal(map[string]string{
			"client_id":     req.Metadata.ClientID,
			"client_secret": req.Metadata.ClientSecret,
			"refresh_token": req.Metadata.RefreshToken,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encode metadata"})
			return
		}
		encryptedMeta, err := utils.EncryptAES256GCM(string(metaBytes), h.encKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encrypt metadata"})
			return
		}
		existing.EncryptedMetadata = sql.NullString{String: encryptedMeta, Valid: true}
		cid := req.Metadata.ClientID
		if len(cid) > 12 {
			existing.KeyPrefix = cid[:12]
		} else {
			existing.KeyPrefix = cid
		}
		if len(cid) > 16 {
			existing.MaskedKey = cid[:6] + "••••" + cid[len(cid)-4:]
		} else {
			existing.MaskedKey = cid + "••••"
		}
		_ = h.cooldownStore.DeleteAccessToken(c.Request.Context(), existing.ID)
	}
	if req.APIKey != "" {
		encrypted, err := utils.EncryptAES256GCM(req.APIKey, h.encKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encrypt key"})
			return
		}
		existing.EncryptedKey = encrypted
		prefixLen := 8
		if len(req.APIKey) < prefixLen {
			prefixLen = len(req.APIKey)
		}
		existing.KeyPrefix = req.APIKey[:prefixLen]

		suffixLen := 4
		if len(req.APIKey) <= prefixLen+suffixLen {
			existing.MaskedKey = existing.KeyPrefix + "••••"
		} else {
			existing.MaskedKey = existing.KeyPrefix + "••••" + req.APIKey[len(req.APIKey)-suffixLen:]
		}
	}

	if err := h.credentials.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update credential"})
		return
	}
	c.JSON(http.StatusOK, existing)
}

// Delete godoc
// @Summary      Delete credential
// @Description  Delete a credential
// @Tags         credentials
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Param        credId path string true "Credential ID"
// @Success      204
// @Failure      404 {object} map[string]string
// @Failure      409 {object} map[string]string
// @Router       /api/providers/{id}/credentials/{credId} [delete]
func (h *CredentialHandler) Delete(c *gin.Context) {
	credID := c.Param("credId")
	cred, err := h.credentials.FindByID(c.Request.Context(), credID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "credential not found"})
		return
	}

	// 1. Guard against deleting credential with active in-flight streams
	if h.cooldownStore != nil {
		if summary, err := h.cooldownStore.GetActiveStreams(c.Request.Context()); err == nil {
			maskedName := utils.MaskEmailName(cred.Name)
			count := summary.ByCredential[maskedName]
			if count == 0 && cred.MaskedKey != "" {
				count = summary.ByCredential[cred.MaskedKey]
			}
			if count > 0 {
				c.JSON(http.StatusConflict, gin.H{
					"error": fmt.Sprintf("Cannot delete credential: it is currently processing %d active live streams", count),
				})
				return
			}
		}
	}

	// 2. Guard against deleting sole active credential for provider with active Gateway Keys
	if h.gatewayKeys != nil && h.credentials != nil {
		activeCredsCount, err := h.credentials.CountActiveByProviderID(c.Request.Context(), cred.ProviderID)
		if err == nil && activeCredsCount <= 1 {
			gwKeyCount, err := h.gatewayKeys.CountByProviderID(c.Request.Context(), cred.ProviderID)
			if err == nil && gwKeyCount > 0 {
				c.JSON(http.StatusConflict, gin.H{
					"error": fmt.Sprintf("Cannot delete the only active credential for provider with %d active Gateway API Key(s)", gwKeyCount),
				})
				return
			}
		}
	}

	if err := h.credentials.Delete(c.Request.Context(), credID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete credential"})
		return
	}

	// Clean up Redis state
	if h.cooldownStore != nil {
		_ = h.cooldownStore.ClearCooldown(c.Request.Context(), credID)
		_ = h.cooldownStore.DeleteAccessToken(c.Request.Context(), credID)
		_ = h.cooldownStore.DeleteCredentialQuota(c.Request.Context(), credID)
	}

	c.Status(http.StatusNoContent)
}

// ResetCooldown godoc
// @Summary      Reset credential cooldown
// @Description  Manually reset cooldown state for a credential
// @Tags         credentials
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Param        credId path string true "Credential ID"
// @Success      200 {object} map[string]string
// @Router       /api/providers/{id}/credentials/{credId}/reset-cooldown [post]
func (h *CredentialHandler) ResetCooldown(c *gin.Context) {
	credID := c.Param("credId")
	if h.cooldownStore != nil {
		_ = h.cooldownStore.ClearCooldown(c.Request.Context(), credID)
		_ = h.cooldownStore.DeleteCredentialQuota(c.Request.Context(), credID)
	}
	_ = h.credentials.UpdateStatus(c.Request.Context(), credID, "active")
	if h.publisher != nil {
		_ = h.publisher.Publish(c.Request.Context(), "CREDENTIAL_STATUS_CHANGED", map[string]interface{}{
			"credentialId": credID,
			"status":       "active",
		})
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Cooldown reset successfully"})
}

// Reveal godoc
// @Summary      Reveal unmasked credential name
// @Description  Get unmasked original credential name
// @Tags         credentials
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Param        credId path string true "Credential ID"
// @Success      200 {object} map[string]string
// @Failure      404 {object} map[string]string
// @Router       /api/providers/{id}/credentials/{credId}/reveal [post]
func (h *CredentialHandler) Reveal(c *gin.Context) {
	credID := c.Param("credId")
	cred, err := h.credentials.FindByID(c.Request.Context(), credID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "credential not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":   cred.ID,
		"name": cred.Name,
	})
}

func (h *CredentialHandler) Test(c *gin.Context) {
	credID := c.Param("credId")
	cred, err := h.credentials.FindByID(c.Request.Context(), credID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "credential not found"})
		return
	}

	provider, err := h.providers.FindByID(c.Request.Context(), cred.ProviderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "provider not found"})
		return
	}

	var apiKey string
	if cred.AuthType == "gcp_user_oauth" {
		if !cred.EncryptedMetadata.Valid || cred.EncryptedMetadata.String == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing encrypted oauth metadata"})
			return
		}
		metaStr, err := utils.DecryptAES256GCM(cred.EncryptedMetadata.String, h.encKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to decrypt oauth metadata"})
			return
		}
		var meta map[string]string
		if err := json.Unmarshal([]byte(metaStr), &meta); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse oauth metadata"})
			return
		}
		tokenMgr := proxy.NewOAuthTokenManager(h.cooldownStore)
		token, err := tokenMgr.GetAccessToken(c.Request.Context(), cred.ID, meta)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "oauth token refresh failed: " + err.Error()})
			return
		}
		apiKey = token
	} else {
		var err error
		apiKey, err = utils.DecryptAES256GCM(cred.EncryptedKey, h.encKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to decrypt key"})
			return
		}
	}

	start := time.Now()
	var statusCode int
	var errMsg string

	switch provider.Type {
	case "anthropic":
		statusCode, errMsg = h.testAnthropic(provider.BaseURL, apiKey)
	case "google":
		statusCode, errMsg = h.testGoogle(provider.BaseURL, apiKey, cred.AuthType)
	case "opencode":
		statusCode, errMsg = h.testOpenCode(provider.BaseURL, apiKey)
	default:
		statusCode, errMsg = h.testOpenAI(provider.BaseURL, apiKey)
	}

	latency := int(time.Since(start).Milliseconds())

	success := statusCode >= 200 && statusCode < 300
	if success && h.cooldownStore != nil {
		_ = h.cooldownStore.ClearCooldown(c.Request.Context(), credID)
		_ = h.cooldownStore.DeleteCredentialQuota(c.Request.Context(), credID)
		_ = h.credentials.UpdateStatus(c.Request.Context(), credID, "active")
		if h.publisher != nil {
			_ = h.publisher.Publish(c.Request.Context(), "CREDENTIAL_QUOTA_UPDATED", map[string]interface{}{
				"credentialId": credID,
				"quota":        nil,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    success,
		"latencyMs":  latency,
		"httpStatus": statusCode,
		"error":      errMsg,
	})
}

func (h *CredentialHandler) testOpenAI(baseURL, apiKey string) (int, string) {
	u, err := url.Parse(baseURL)
	if err != nil {
		return 0, "invalid base URL"
	}
	u.Path = path.Join(u.Path, "v1", "models")

	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		return 0, "failed to create request"
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err.Error()
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return resp.StatusCode, "authentication failed"
	}
	return resp.StatusCode, ""
}

func (h *CredentialHandler) testAnthropic(baseURL, apiKey string) (int, string) {
	u, err := url.Parse(baseURL)
	if err != nil {
		return 0, "invalid base URL"
	}
	u.Path = path.Join(u.Path, "v1", "messages")

	req, err := http.NewRequest("POST", u.String(), strings.NewReader(`{"model":"claude-3-haiku-20240307","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}`))
	if err != nil {
		return 0, "failed to create request"
	}
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err.Error()
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return resp.StatusCode, "authentication failed"
	}
	return resp.StatusCode, ""
}

func (h *CredentialHandler) testGoogle(baseURL, apiKey, authType string) (int, string) {
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com"
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		return 0, "invalid base URL"
	}
	u.Path = path.Join(u.Path, "v1beta", "models")

	if authType != "gcp_user_oauth" {
		q := u.Query()
		q.Set("key", apiKey)
		u.RawQuery = q.Encode()
	}

	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		return 0, "failed to create request"
	}

	if authType == "gcp_user_oauth" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	} else {
		req.Header.Set("x-goog-api-key", apiKey)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err.Error()
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		errText := string(bodyBytes)
		if errText == "" {
			errText = "authentication failed"
		}
		return resp.StatusCode, errText
	}
	return resp.StatusCode, ""
}

func (h *CredentialHandler) testOpenCode(baseURL, apiKey string) (int, string) {
	if baseURL == "" {
		baseURL = "https://opencode.ai/zen"
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		return 0, "invalid base URL"
	}
	u.Path = path.Join(u.Path, "v1", "models")

	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		return 0, "failed to create request"
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("x-api-key", apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err.Error()
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return resp.StatusCode, "authentication failed"
	}
	return resp.StatusCode, ""
}

func (h *CredentialHandler) enrichCredentialQuota(ctx context.Context, cred *models.Credential) {
	if h.cooldownStore == nil || cred == nil {
		return
	}

	ttl, _ := h.cooldownStore.GetCooldownTTL(ctx, cred.ID)
	if ttl > 0 {
		cred.IsCoolingDown = true
		cred.CooldownTTL = int(ttl.Seconds())
	}

	q, err := h.cooldownStore.GetCredentialQuota(ctx, cred.ID)
	if err == nil && q != nil {
		now := time.Now()
		nowUnix := now.Unix()
		isExpired := false

		// 1. Check ResetAt timestamp
		if q.ResetAt != "" {
			if t, err := time.Parse(time.RFC3339, q.ResetAt); err == nil && now.After(t) {
				isExpired = true
			}
		}

		// 2. Check ResetDurationSec relative to LastUpdated
		if !isExpired && q.ResetDurationSec > 0 && q.LastUpdated > 0 {
			if nowUnix >= q.LastUpdated+int64(q.ResetDurationSec) {
				isExpired = true
			}
		}

		// 3. Check Daily Quota Reset (Midnight UTC)
		if !isExpired && q.LastUpdated > 0 {
			lowerStatus := strings.ToLower(q.StatusText)
			if strings.Contains(lowerStatus, "daily") || strings.Contains(lowerStatus, "free") {
				lastUpdatedUtc := time.Unix(q.LastUpdated, 0).UTC()
				if now.UTC().Year() > lastUpdatedUtc.Year() || now.UTC().YearDay() > lastUpdatedUtc.YearDay() {
					isExpired = true
				}
			}
		}

		// 4. If cooldown TTL has passed (ttl <= 0) and statusText is a rate limit or daily quota message
		if !isExpired && ttl <= 0 && q.ResetAt == "" && q.ResetDurationSec == 0 {
			lowerStatus := strings.ToLower(q.StatusText)
			if strings.Contains(lowerStatus, "rate limit") || strings.Contains(lowerStatus, "cooldown") {
				isExpired = true
			}
		}

		if isExpired {
			_ = h.cooldownStore.DeleteCredentialQuota(ctx, cred.ID)
			cred.Quota = nil
		} else {
			cred.Quota = &models.CredentialQuota{
				RemainingRequests: q.RemainingRequests,
				LimitRequests:     q.LimitRequests,
				RemainingTokens:   q.RemainingTokens,
				LimitTokens:       q.LimitTokens,
				ResetDurationSec:  q.ResetDurationSec,
				ResetAt:           q.ResetAt,
				StatusText:        q.StatusText,
				LastUpdated:       q.LastUpdated,
			}
		}
	}

	remQuota := int64(0)
	hasQuotaLimit := false
	isExhausted := false
	if cred.Quota != nil {
		remQuota = cred.Quota.RemainingRequests
		if cred.Quota.LimitRequests > 0 {
			hasQuotaLimit = true
			if cred.Quota.RemainingRequests <= 0 {
				isExhausted = true
			}
		}
	}

	cred.HealthScore = proxy.CalculateCredentialHealthScore(cred.RequestCount, cred.ErrorCount, cred.IsCoolingDown, remQuota, hasQuotaLimit)
	cred.Status = proxy.DetermineCredentialStatus(cred.Enabled, cred.IsCoolingDown, isExhausted, cred.HealthScore)
}


