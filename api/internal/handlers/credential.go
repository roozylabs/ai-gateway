package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/models"
	"github.com/roozylabs/ai-gateway/internal/repository"
	"github.com/roozylabs/ai-gateway/internal/utils"
)

type CredentialHandler struct {
	credentials *repository.CredentialRepository
	providers   *repository.ProviderRepository
	encKey      string
}

func NewCredentialHandler(credentials *repository.CredentialRepository, providers *repository.ProviderRepository, encKey string) *CredentialHandler {
	return &CredentialHandler{
		credentials: credentials,
		providers:   providers,
		encKey:      encKey,
	}
}

type CreateCredentialRequest struct {
	Name     string `json:"name" binding:"required"`
	APIKey   string `json:"apiKey" binding:"required"`
	Priority int    `json:"priority"`
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
	credentials, err := h.credentials.ListByProviderID(c.Request.Context(), providerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list credentials"})
		return
	}
	if credentials == nil {
		credentials = []models.Credential{}
	}
	c.JSON(http.StatusOK, credentials)
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

	encrypted, err := utils.EncryptAES256GCM(req.APIKey, h.encKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encrypt key"})
		return
	}

	keyPrefix := req.APIKey
	if len(keyPrefix) > 8 {
		keyPrefix = keyPrefix[:8]
	}

	cred := &models.Credential{
		ProviderID:   providerID,
		Name:         req.Name,
		EncryptedKey: encrypted,
		KeyPrefix:    keyPrefix,
		Priority:     req.Priority,
		Enabled:      true,
		Status:       "active",
	}

	if err := h.credentials.Create(c.Request.Context(), cred); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create credential"})
		return
	}
	c.JSON(http.StatusCreated, cred)
}

// Update godoc
// @Summary      Update credential
// @Description  Update a credential
// @Tags         credentials
// @Security     BearerAuth
// @Param        id path string true "Provider ID"
// @Param        credId path string true "Credential ID"
// @Param        request body models.Credential true "Credential data"
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

	if err := c.ShouldBindJSON(existing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
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
// @Router       /api/providers/{id}/credentials/{credId} [delete]
func (h *CredentialHandler) Delete(c *gin.Context) {
	credID := c.Param("credId")
	if err := h.credentials.Delete(c.Request.Context(), credID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "credential not found"})
		return
	}
	c.Status(http.StatusNoContent)
}
