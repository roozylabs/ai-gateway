package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/username/ai-gateway/internal/models"
	"github.com/username/ai-gateway/internal/repository"
	"github.com/username/ai-gateway/internal/utils"
)

type GatewayKeyHandler struct {
	keys *repository.GatewayKeyRepository
}

func NewGatewayKeyHandler(keys *repository.GatewayKeyRepository) *GatewayKeyHandler {
	return &GatewayKeyHandler{keys: keys}
}

type CreateGatewayKeyRequest struct {
	Name          string   `json:"name" binding:"required"`
	RateLimit     int      `json:"rateLimit"`
	AllowedModels []string `json:"allowedModels"`
}

type CreateGatewayKeyResponse struct {
	models.GatewayAPIKey
	RawKey string `json:"key"`
}

func (h *GatewayKeyHandler) Create(c *gin.Context) {
	var req CreateGatewayKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	rawBytes := make([]byte, 24)
	if _, err := rand.Read(rawBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate key"})
		return
	}
	rawKey := "gw_sk_" + hex.EncodeToString(rawBytes)
	keyHash := utils.HashSHA256(rawKey)
	keyPrefix := rawKey[:12] + "..."

	rateLimit := req.RateLimit
	if rateLimit == 0 {
		rateLimit = 100
	}

	key := &models.GatewayAPIKey{
		UserID:        c.GetString("userId"),
		Name:          req.Name,
		KeyHash:       keyHash,
		KeyPrefix:     keyPrefix,
		Enabled:       true,
		RateLimit:     rateLimit,
		AllowedModels: req.AllowedModels,
	}

	if err := h.keys.Create(c.Request.Context(), key); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create key"})
		return
	}

	c.JSON(http.StatusCreated, CreateGatewayKeyResponse{
		GatewayAPIKey: *key,
		RawKey:        rawKey,
	})
}

func (h *GatewayKeyHandler) List(c *gin.Context) {
	userID := c.GetString("userId")
	keys, err := h.keys.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list keys"})
		return
	}
	if keys == nil {
		keys = []models.GatewayAPIKey{}
	}
	c.JSON(http.StatusOK, keys)
}

func (h *GatewayKeyHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.keys.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "key not found"})
		return
	}
	c.Status(http.StatusNoContent)
}
