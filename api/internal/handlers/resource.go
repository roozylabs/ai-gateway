package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/proxy"
	"github.com/roozylabs/prism/internal/repository"
	"github.com/roozylabs/prism/internal/utils"
)

type ResourceHandler struct {
	resources *repository.ResourceRepository
	backends  *repository.ResourceBackendRepository
	gateway   proxy.ResourceGatewayExecutor
	encKey    string
}

func NewResourceHandler(resources *repository.ResourceRepository, backends *repository.ResourceBackendRepository, gateway proxy.ResourceGatewayExecutor, encKey string) *ResourceHandler {
	return &ResourceHandler{resources: resources, backends: backends, gateway: gateway, encKey: encKey}
}

type CreateResourceBackendRequest struct {
	Name             string   `json:"name" binding:"required"`
	BackendType      string   `json:"backendType" binding:"required"`
	EndpointURL      *string  `json:"endpointUrl"`
	HTTPMethod       string   `json:"httpMethod"`
	AuthToken        string   `json:"authToken"`
	QueryTemplate    *string  `json:"queryTemplate"`
	ConnectionString *string  `json:"connectionString"`
	SQLQuery         *string  `json:"sqlQuery"`
	ParamNames       []string `json:"paramNames"`
	TimeoutMs        int      `json:"timeoutMs"`
	Priority         int      `json:"priority"`
}

type CreateResourceRequest struct {
	Name             string                     `json:"name" binding:"required"`
	DisplayName      string                     `json:"displayName"`
	Description      string                     `json:"description"`
	ParametersSchema json.RawMessage            `json:"parametersSchema"`
	Enabled          *bool                      `json:"enabled"`
	Backends         []CreateResourceBackendRequest `json:"backends"`
}

func (h *ResourceHandler) List(c *gin.Context) {
	userID := c.GetString("userId")
	resources, err := h.resources.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list resources: " + err.Error()})
		return
	}
	if resources == nil {
		resources = []models.Resource{}
	}
	c.JSON(http.StatusOK, resources)
}

func (h *ResourceHandler) Get(c *gin.Context) {
	userID := c.GetString("userId")
	rwb, err := h.resources.GetResourceWithBackendsByID(c.Request.Context(), c.Param("id"), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "resource not found"})
		return
	}
	c.JSON(http.StatusOK, rwb)
}

func (h *ResourceHandler) Create(c *gin.Context) {
	userID := c.GetString("userId")
	var req CreateResourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	schema := req.ParametersSchema
	if len(schema) == 0 {
		schema = json.RawMessage(`{}`)
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	res := &models.Resource{
		UserID:           userID,
		Name:             req.Name,
		DisplayName:      req.DisplayName,
		Description:      req.Description,
		ParametersSchema: schema,
		Enabled:          enabled,
	}
	if err := h.resources.Create(c.Request.Context(), res); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create resource"})
		return
	}

	for _, br := range req.Backends {
		if err := h.createBackend(c.Request.Context(), res.ID, br); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "resource created but backend failed: " + br.Name})
			return
		}
	}

	rwb, _ := h.resources.GetResourceWithBackendsByID(c.Request.Context(), res.ID, userID)
	c.JSON(http.StatusCreated, rwb)
}

func (h *ResourceHandler) Update(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")

	existing, err := h.resources.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "resource not found"})
		return
	}

	var req CreateResourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	existing.DisplayName = req.DisplayName
	existing.Description = req.Description
	existing.ParametersSchema = req.ParametersSchema
	if len(existing.ParametersSchema) == 0 {
		existing.ParametersSchema = json.RawMessage(`{}`)
	}
	if req.Enabled != nil {
		existing.Enabled = *req.Enabled
	}
	if err := h.resources.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update resource"})
		return
	}

	if req.Backends != nil {
		if err := h.backends.DeleteByResourceID(c.Request.Context(), id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to replace backends"})
			return
		}
		for _, br := range req.Backends {
			if err := h.createBackend(c.Request.Context(), id, br); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "backend failed: " + br.Name})
				return
			}
		}
	}

	rwb, _ := h.resources.GetResourceWithBackendsByID(c.Request.Context(), id, userID)
	c.JSON(http.StatusOK, rwb)
}

func (h *ResourceHandler) Delete(c *gin.Context) {
	userID := c.GetString("userId")
	if err := h.resources.Delete(c.Request.Context(), c.Param("id"), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete resource"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "resource deleted"})
}

type TestResourceRequest struct {
	Args map[string]interface{} `json:"args" binding:"required"`
}

func (h *ResourceHandler) TestResource(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")

	res, err := h.resources.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "resource not found"})
		return
	}
	var req TestResourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()
	result, err := h.gateway.Execute(ctx, userID, res.Name, req.Args, h.encKey)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *ResourceHandler) createBackend(ctx context.Context, resourceID string, br CreateResourceBackendRequest) error {
	b := &models.ResourceBackend{
		ResourceID:     resourceID,
		Name:           br.Name,
		BackendType:    br.BackendType,
		EndpointURL:    br.EndpointURL,
		HTTPMethod:     br.HTTPMethod,
		QueryTemplate:  br.QueryTemplate,
		SQLQuery:       br.SQLQuery,
		ParamNames:     br.ParamNames,
		TimeoutMs:      br.TimeoutMs,
		Priority:       br.Priority,
		Enabled:        true,
		AuthHeaderName: "Authorization",
		AuthHeaderPrefix: "Bearer ",
	}
	if br.TimeoutMs <= 0 {
		b.TimeoutMs = 30000
	}
	if br.Priority <= 0 {
		b.Priority = 1
	}
	if br.HTTPMethod == "" {
		b.HTTPMethod = "POST"
	}
	if br.AuthToken != "" && h.encKey != "" {
		enc, err := utils.EncryptAES256GCM(br.AuthToken, h.encKey)
		if err != nil {
			return err
		}
		b.AuthTokenEncrypted = &enc
	}
	if br.ConnectionString != nil && *br.ConnectionString != "" && h.encKey != "" {
		enc, err := utils.EncryptAES256GCM(*br.ConnectionString, h.encKey)
		if err != nil {
			return err
		}
		b.ConnectionStringEncrypted = &enc
	}
	return h.backends.Create(ctx, b)
}
