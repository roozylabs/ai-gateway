package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/proxy"
	"github.com/roozylabs/prism/internal/repository"
	"github.com/roozylabs/prism/internal/utils"
)

type MCPHandler struct {
	servers     *repository.MCPServerRepository
	tools       *repository.MCPToolRepository
	gateway     *proxy.MCPGateway
	invocations *repository.MCPInvocationRepository
	agents      *repository.AgentRepository
	encKey      string
}

func NewMCPHandler(servers *repository.MCPServerRepository, tools *repository.MCPToolRepository, gateway *proxy.MCPGateway, invocations *repository.MCPInvocationRepository, agents *repository.AgentRepository, encKey string) *MCPHandler {
	return &MCPHandler{servers: servers, tools: tools, gateway: gateway, invocations: invocations, agents: agents, encKey: encKey}
}

type CreateMCPServerRequest struct {
	Name          string            `json:"name" binding:"required"`
	DisplayName   string            `json:"displayName"`
	Description   string            `json:"description"`
	Type          string            `json:"type"`
	TransportType string            `json:"transportType"`
	EndpointURL   string            `json:"endpointUrl"`
	AuthToken     string            `json:"authToken"`
	Headers       map[string]string `json:"headers"`
	Command       string            `json:"command"`
	Args          []string          `json:"args"`
	Env           map[string]string `json:"env"`
	Enabled       *bool             `json:"enabled"`
}

// MCPServerEdit is the editable representation returned to the dashboard so the
// edit form can be repopulated from a fresh API fetch. It exposes the decrypted
// headers (and whether an auth token is stored) but never returns secret values.
type MCPServerEdit struct {
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	DisplayName   string            `json:"displayName"`
	Description   string            `json:"description"`
	Type          string            `json:"type"`
	TransportType string            `json:"transportType"`
	EndpointURL   string            `json:"endpointUrl"`
	Headers       map[string]string `json:"headers"`
	HasAuthToken  bool              `json:"hasAuthToken"`
	Command       string            `json:"command"`
	Args          []string          `json:"args"`
	Env           map[string]string `json:"env"`
	Enabled       bool              `json:"enabled"`
}

func (h *MCPHandler) toEdit(srv *models.MCPServer) (*MCPServerEdit, error) {
	var headers map[string]string
	if srv.HeadersEncrypted != nil && *srv.HeadersEncrypted != "" {
		raw, err := utils.DecryptAES256GCM(*srv.HeadersEncrypted, h.encKey)
		if err != nil {
			return nil, fmt.Errorf("decrypt headers: %w", err)
		}
		if err := json.Unmarshal([]byte(raw), &headers); err != nil {
			return nil, fmt.Errorf("unmarshal headers: %w", err)
		}
	}
	if headers == nil {
		headers = map[string]string{}
	}
	return &MCPServerEdit{
		ID:            srv.ID,
		Name:          srv.Name,
		DisplayName:   srv.DisplayName,
		Description:   srv.Description,
		Type:          srv.Type,
		TransportType: srv.TransportType,
		EndpointURL:   srv.EndpointURL,
		Headers:       headers,
		HasAuthToken:  srv.AuthTokenEncrypted != nil,
		Command:       srv.Command,
		Args:          srv.Args,
		Env:           srv.Env,
		Enabled:       srv.Enabled,
	}, nil
}

func cleanToken(tok string) string {
	tok = strings.TrimSpace(tok)
	for strings.HasPrefix(strings.ToLower(tok), "bearer ") {
		tok = strings.TrimSpace(tok[7:])
	}
	return tok
}

func cleanAuthorizationHeader(val string) string {
	val = strings.TrimSpace(val)
	if val == "" {
		return ""
	}
	token := cleanToken(val)
	if token == "" {
		return ""
	}
	return "Bearer " + token
}

// buildConfigHeaders merges the request's explicit authToken into the generic
// headers map (Authorization shortcut) and returns the serialized+encrypted
// payload for the headers_encrypted column.
func (h *MCPHandler) buildConfigHeaders(req CreateMCPServerRequest) (*string, error) {
	headers := map[string]string{}
	for k, v := range req.Headers {
		kClean := strings.TrimSpace(k)
		vClean := strings.TrimSpace(v)
		if kClean != "" && vClean != "" {
			if strings.EqualFold(kClean, "Authorization") {
				vClean = cleanAuthorizationHeader(vClean)
			}
			headers[kClean] = vClean
		}
	}

	if req.AuthToken != "" {
		token := cleanToken(req.AuthToken)
		if token != "" {
			headers["Authorization"] = "Bearer " + token
		}
	}

	if len(headers) == 0 || h.encKey == "" {
		return nil, nil
	}
	raw, err := json.Marshal(headers)
	if err != nil {
		return nil, fmt.Errorf("marshal headers: %w", err)
	}
	enc, err := utils.EncryptAES256GCM(string(raw), h.encKey)
	if err != nil {
		return nil, fmt.Errorf("encrypt headers: %w", err)
	}
	return &enc, nil
}

func (h *MCPHandler) List(c *gin.Context) {
	userID := c.GetString("userId")
	servers, err := h.servers.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list mcp servers: " + err.Error()})
		return
	}
	if servers == nil {
		servers = []models.MCPServer{}
	}
	c.JSON(http.StatusOK, servers)
}

func (h *MCPHandler) Get(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	srv, err := h.servers.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "mcp server not found"})
		return
	}
	edit, err := h.toEdit(srv)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load mcp server: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, edit)
}

func (h *MCPHandler) Create(c *gin.Context) {
	userID := c.GetString("userId")
	var req CreateMCPServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	configType := strings.ToLower(strings.TrimSpace(req.Type))
	if configType == "" {
		configType = "remote"
	}
	if configType == "local" {
		if strings.TrimSpace(req.Command) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "command is required for local MCP servers"})
			return
		}
	} else if strings.TrimSpace(req.EndpointURL) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "endpointUrl is required for remote MCP servers"})
		return
	}

	transport := req.TransportType
	if transport == "" {
		transport = "http"
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	headersEnc, err := h.buildConfigHeaders(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encrypt headers"})
		return
	}

	srv := &models.MCPServer{
		UserID:           userID,
		Name:             req.Name,
		DisplayName:      req.DisplayName,
		Description:      req.Description,
		Type:             configType,
		TransportType:    transport,
		EndpointURL:      req.EndpointURL,
		HeadersEncrypted: headersEnc,
		HasHeaders:       headersEnc != nil,
		Command:          req.Command,
		Args:             req.Args,
		Env:              req.Env,
		Status:           "connected",
		Enabled:          enabled,
	}
	if srv.Args == nil {
		srv.Args = []string{}
	}
	if srv.Env == nil {
		srv.Env = map[string]string{}
	}

	if err := h.servers.Create(c.Request.Context(), srv); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create mcp server: " + err.Error()})
		return
	}

	// Trigger auto-sync in background or sync immediately
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	st, err := h.gateway.SyncServerTools(ctx, srv.ID, userID, h.encKey)
	if err != nil {
		st, _ = h.servers.GetServerWithTools(c.Request.Context(), srv)
	}

	c.JSON(http.StatusCreated, st)
}

func (h *MCPHandler) Update(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	existing, err := h.servers.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "mcp server not found"})
		return
	}

	var req CreateMCPServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	existing.DisplayName = req.DisplayName
	existing.Description = req.Description
	if req.Type != "" {
		existing.Type = strings.ToLower(strings.TrimSpace(req.Type))
	}
	if req.TransportType != "" {
		existing.TransportType = req.TransportType
	}
	if req.EndpointURL != "" {
		existing.EndpointURL = req.EndpointURL
	}
	if req.Command != "" {
		existing.Command = req.Command
	}
	if req.Args != nil {
		existing.Args = req.Args
	}
	if req.Env != nil {
		existing.Env = req.Env
	}
	if req.Enabled != nil {
		existing.Enabled = *req.Enabled
	}

	// Rebuild encrypted headers only when auth or headers were supplied; the
	// absent flag allows clearing previously stored headers.
	if req.AuthToken != "" || len(req.Headers) > 0 {
		headersEnc, err := h.buildConfigHeaders(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encrypt headers"})
			return
		}
		existing.HeadersEncrypted = headersEnc
		existing.HasHeaders = headersEnc != nil
	}

	if err := h.servers.Update(c.Request.Context(), existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update mcp server"})
		return
	}

	st, _ := h.servers.GetServerWithTools(c.Request.Context(), existing)
	c.JSON(http.StatusOK, st)
}

func (h *MCPHandler) Delete(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	if err := h.servers.Delete(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete mcp server"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "mcp server deleted"})
}

func (h *MCPHandler) Sync(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	st, err := h.gateway.SyncServerTools(ctx, id, userID, h.encKey)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "sync failed: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, st)
}

type TestMCPToolRequest struct {
	Tool string                 `json:"tool" binding:"required"`
	Args map[string]interface{} `json:"args"`
}

func (h *MCPHandler) TestTool(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	srv, err := h.servers.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "mcp server not found"})
		return
	}

	var req TestMCPToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()
	res, err := h.gateway.ExecuteTool(ctx, userID, srv.Name, req.Tool, req.Args, h.encKey)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

// ListTools returns the tools previously synced from an MCP server so the
// dashboard test modal can render a tool selector and its input schema.
func (h *MCPHandler) ListTools(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")

	if _, err := h.servers.FindByID(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "mcp server not found"})
		return
	}

	tools, err := h.tools.ListByServerID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load mcp tools: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, tools)
}

// Stats returns aggregated usage metrics and agent bindings for a single MCP
// server within a sliding day window, following the analytics response shape
// ({ "data": ... }).
func (h *MCPHandler) Stats(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")

	srv, err := h.servers.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "mcp server not found"})
		return
	}

	days := 30
	if d := c.Query("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			days = parsed
		}
	}
	if days > 90 {
		days = 90
	}

	stats, err := h.invocations.GetStats(c.Request.Context(), userID, id, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load mcp server stats: " + err.Error()})
		return
	}

	agents, err := h.agents.FindByMCPServerName(c.Request.Context(), userID, srv.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load mcp server agent bindings: " + err.Error()})
		return
	}

	for _, a := range agents {
		stats.Agents = append(stats.Agents, models.MCPAgentBinding{
			ID:          a.ID,
			Name:        a.Name,
			DisplayName: a.DisplayName,
			Status:      a.Status,
			Enabled:     a.Enabled,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": stats})
}
