package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/proxy"
	goredis "github.com/roozylabs/prism/internal/redis"
	"github.com/roozylabs/prism/internal/repository"
	"github.com/roozylabs/prism/internal/utils"
)

type GatewayHandler struct {
	engine          *proxy.Engine
	gatewayKeys     *repository.GatewayKeyRepository
	requestLogs     *repository.RequestLogRepository
	eventPublisher  *goredis.EventPublisher
	pricingRepo     *repository.ModelPricingRepository
	idemStore       *proxy.IdempotencyStore
	agentGovernance *proxy.AgentGovernanceEngine
	rbacEngine      *proxy.RBACEngine
	auditRecorder   *proxy.AuditRecorder
	modelRepo       *repository.ModelRepository
}

func NewGatewayHandler(
	engine *proxy.Engine,
	gatewayKeys *repository.GatewayKeyRepository,
	requestLogs *repository.RequestLogRepository,
	eventPublisher *goredis.EventPublisher,
	pricingRepo *repository.ModelPricingRepository,
	idemStore *proxy.IdempotencyStore,
	agentGovernance *proxy.AgentGovernanceEngine,
	rbacEngine *proxy.RBACEngine,
	auditRecorder *proxy.AuditRecorder,
	modelRepo *repository.ModelRepository,
) *GatewayHandler {
	return &GatewayHandler{
		engine:          engine,
		gatewayKeys:     gatewayKeys,
		requestLogs:     requestLogs,
		eventPublisher:  eventPublisher,
		pricingRepo:     pricingRepo,
		idemStore:       idemStore,
		agentGovernance: agentGovernance,
		rbacEngine:      rbacEngine,
		auditRecorder:   auditRecorder,
		modelRepo:       modelRepo,
	}
}

// ChatCompletions godoc
// @Summary      Create Chat Completion
// @Description  OpenAI-compatible chat completion endpoint supporting prism-auto smart routing and streaming.
// @Tags         gateway
// @Accept       json
// @Produce      json
// @Param        X-Prism-Org-ID header string false "Organization ID"
// @Param        X-Prism-Workspace-ID header string false "Workspace ID"
// @Param        X-Prism-Agent-ID header string false "Agent ID"
// @Param        request body proxy.ProxyRequest true "Chat Completion Request Payload"
// @Security     BearerAuth
// @Success      200 {object} map[string]interface{}
// @Failure      400 {object} map[string]interface{}
// @Failure      401 {object} map[string]interface{}
// @Failure      429 {object} map[string]interface{}
// @Router       /v1/chat/completions [post]
func (h *GatewayHandler) ChatCompletions(c *gin.Context) {
	gatewayKey := c.MustGet("gatewayKey").(*models.GatewayAPIKey)
	requestID := uuid.New().String()
	c.Set("requestID", requestID)

	if _, hasIdem := c.Get("_idem_key"); hasIdem {
		proxy.WrapBufferedWriter(c)
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "Failed to read request body", "type": "invalid_request_error"}})
		return
	}

	var req proxy.ProxyRequest
	if err := json.Unmarshal(body, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "Invalid JSON", "type": "invalid_request_error"}})
		return
	}

	if req.Model == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "Model is required", "type": "invalid_request_error"}})
		return
	}

	clientIP := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	clientApp := parseClientApp(userAgent)

	if req.Stream {
		log, err := h.engine.ProxyStream(c, &req, gatewayKey)
		if err != nil {
			h.handleProxyError(c, err, gatewayKey, &req, requestID, clientIP, userAgent, clientApp, true)
			return
		}
		if log != nil {
			log.RequestID = requestID
			log.ClientIP = clientIP
			log.UserAgent = userAgent
			log.ClientApp = clientApp
			log.IsStream = true
			if log.CostUSD == 0 && h.pricingRepo != nil {
				log.CostUSD = h.pricingRepo.CalculateCost(log.Model, log.ProviderType, log.InputTokens, log.OutputTokens)
			}
			_ = h.requestLogs.Create(c.Request.Context(), log)
			_ = h.gatewayKeys.IncrementUsage(c.Request.Context(), gatewayKey.ID)
			h.publishEvents(c, requestID, log, gatewayKey)
			h.recordAuditTrail(c, log, gatewayKey)

			c.Header("X-Request-ID", requestID)
			c.Header("X-Roozy-Model", log.Model)
			c.Header("X-Roozy-Provider", log.ProviderType)
		}
		proxy.SaveIdempotencyResult(c, h.idemStore)
		return
	}

	resp, log, err := h.engine.Proxy(c, &req, gatewayKey)
	if err != nil {
		h.handleProxyError(c, err, gatewayKey, &req, requestID, clientIP, userAgent, clientApp, false)
		return
	}

	if log != nil {
		log.RequestID = requestID
		log.ClientIP = clientIP
		log.UserAgent = userAgent
		log.ClientApp = clientApp
		log.IsStream = false
		if log.CostUSD == 0 && h.pricingRepo != nil {
			log.CostUSD = h.pricingRepo.CalculateCost(log.Model, log.ProviderType, log.InputTokens, log.OutputTokens)
		}
		_ = h.requestLogs.Create(c.Request.Context(), log)
		_ = h.gatewayKeys.IncrementUsage(c.Request.Context(), gatewayKey.ID)
		h.publishEvents(c, requestID, log, gatewayKey)
		h.recordAuditTrail(c, log, gatewayKey)

		c.Header("X-Request-ID", requestID)
		c.Header("X-Roozy-Model", log.Model)
		c.Header("X-Roozy-Provider", log.ProviderType)
	}

	if resp != nil && resp.Error != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": resp.Error.Message,
				"type":    resp.Error.Type,
				"code":    resp.Error.Code,
			},
		})
		return
	}

	c.JSON(http.StatusOK, resp)
	proxy.SaveIdempotencyResult(c, h.idemStore)
}

func (h *GatewayHandler) publishEvents(c *gin.Context, requestID string, log *models.RequestLog, key *models.GatewayAPIKey) {
	if log == nil {
		return
	}
	_ = h.eventPublisher.Publish(c.Request.Context(), "REQUEST_COMPLETED", map[string]interface{}{
		"requestId":  requestID,
		"model":      log.Model,
		"statusCode": log.StatusCode,
		"latencyMs":  log.LatencyMs,
		"tokens":     log.TotalTokens,
	})

	_ = h.eventPublisher.Publish(c.Request.Context(), "NEW_REQUEST_LOG", map[string]interface{}{
		"requestId":  requestID,
		"model":      log.Model,
		"statusCode": log.StatusCode,
		"latencyMs":  log.LatencyMs,
		"createdAt":  log.CreatedAt,
	})

	if key != nil {
		_ = h.eventPublisher.Publish(c.Request.Context(), "KEY_USED", map[string]interface{}{
			"gatewayKeyId": key.ID,
			"requestCount": key.RequestCount,
		})
	}
}

func (h *GatewayHandler) handleProxyError(c *gin.Context, err error, key *models.GatewayAPIKey, req *proxy.ProxyRequest, requestID, clientIP, userAgent, clientApp string, isStream bool) {
	status, errType, errCode, cleanMsg := utils.CleanUpstreamError(err)
	c.JSON(status, gin.H{
		"error": gin.H{
			"message": cleanMsg,
			"type":    errType,
			"code":    errCode,
			"param":   nil,
		},
	})

	if key != nil && h.requestLogs != nil {
		modelName := ""
		if req != nil {
			modelName = req.Model
		}
		errLog := &models.RequestLog{
			RequestID:       requestID,
			GatewayAPIKeyID: &key.ID,
			Model:           modelName,
			StatusCode:      status,
			LatencyMs:       0,
			InputTokens:     0,
			OutputTokens:    0,
			TotalTokens:     0,
			CostUSD:         0,
			ErrorMessage:    sql.NullString{String: cleanMsg, Valid: cleanMsg != ""},
			ClientIP:        clientIP,
			UserAgent:       userAgent,
			ClientApp:       clientApp,
			IsStream:        isStream,
			CreatedAt:       time.Now(),
		}
		if v, ok := c.Get(proxy.CtxFailoverInfo); ok {
			if fi, fiOK := v.(*proxy.FailoverInfo); fiOK && fi != nil {
				if len(fi.Attempts) > 0 {
					errLog.Attempts = fi.Attempts
				}
				if fi.LastStatus > 0 {
					errLog.StatusCode = fi.LastStatus
				}
				if fi.Retries > 0 {
					errLog.RetryCount = fi.Retries
				}
			}
		}
		_ = h.requestLogs.Create(c.Request.Context(), errLog)
		h.publishEvents(c, requestID, errLog, key)
	}
}

func (h *GatewayHandler) SandboxChatCompletions(c *gin.Context) {
	keyPrefix := c.GetHeader("X-Sandbox-Key-Prefix")
	if keyPrefix == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "Missing X-Sandbox-Key-Prefix header", "type": "invalid_request_error"}})
		return
	}

	gatewayKey, err := h.gatewayKeys.FindByKeyPrefix(c.Request.Context(), keyPrefix)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "Invalid API key prefix", "type": "invalid_request_error"}})
		return
	}

	c.Set("gatewayKey", gatewayKey)
	h.ChatCompletions(c)
}

// Models godoc
// @Summary      List Models
// @Description  List all available OpenAI-compatible models supported by Prism Gateway.
// @Tags         gateway
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} map[string]interface{}
// @Router       /v1/models [get]
func (h *GatewayHandler) Models(c *gin.Context) {
	modelsMap := make(map[string]map[string]interface{})
	modelsList := []map[string]interface{}{}

	// Always include prism-auto smart router
	autoItem := map[string]interface{}{
		"id":       models.SmartRouterModel,
		"object":   "model",
		"owned_by": "roozylabs",
	}
	modelsList = append(modelsList, autoItem)
	modelsMap[models.SmartRouterModel] = autoItem

	// Query dynamic enabled models from DB repository if available
	if h.modelRepo != nil {
		if dbModels, err := h.modelRepo.ListEnabled(c.Request.Context()); err == nil && len(dbModels) > 0 {
			for _, m := range dbModels {
				id := m.Slug
				if id == "" {
					id = m.Name
				}
				if id == "" || modelsMap[id] != nil {
					continue
				}

				ownedBy := detectOwnedBy(id, m.ProviderName)
				item := map[string]interface{}{
					"id":       id,
					"object":   "model",
					"owned_by": ownedBy,
					"created":  m.CreatedAt.Unix(),
				}
				modelsList = append(modelsList, item)
				modelsMap[id] = item
			}
		}
	}

	// Fallback list of supported models
	fallbacks := []map[string]interface{}{
		{"id": "gpt-4o", "object": "model", "owned_by": "openai"},
		{"id": "gpt-4o-mini", "object": "model", "owned_by": "openai"},
		{"id": "claude-3-7-sonnet", "object": "model", "owned_by": "anthropic"},
		{"id": "claude-3-5-sonnet-20241022", "object": "model", "owned_by": "anthropic"},
		{"id": "claude-3-haiku-20240307", "object": "model", "owned_by": "anthropic"},
		{"id": "gemini-3.6-flash", "object": "model", "owned_by": "google"},
		{"id": "gemini-3.7-flash", "object": "model", "owned_by": "google"},
		{"id": "hy3-free", "object": "model", "owned_by": "opencode"},
		{"id": "mimo-v2.5-free", "object": "model", "owned_by": "opencode"},
		{"id": "deepseek-v4-flash-free", "object": "model", "owned_by": "opencode"},
		{"id": "nemotron-3-ultra-free", "object": "model", "owned_by": "opencode"},
		{"id": "nemotron-3.5-lightning-free", "object": "model", "owned_by": "opencode"},
		{"id": "laguna-s-2.1-free", "object": "model", "owned_by": "opencode"},
		{"id": "big-pickle", "object": "model", "owned_by": "opencode"},
	}

	for _, fb := range fallbacks {
		id := fb["id"].(string)
		if modelsMap[id] == nil {
			modelsList = append(modelsList, fb)
			modelsMap[id] = fb
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"object": "list",
		"data":   modelsList,
	})
}

func detectOwnedBy(slug, providerName string) string {
	if providerName != "" {
		return strings.ToLower(providerName)
	}
	s := strings.ToLower(slug)
	if strings.HasPrefix(s, "gpt") || strings.HasPrefix(s, "o1") || strings.HasPrefix(s, "o3") {
		return "openai"
	}
	if strings.HasPrefix(s, "claude") {
		return "anthropic"
	}
	if strings.HasPrefix(s, "gemini") {
		return "google"
	}
	if strings.HasSuffix(s, "-free") || s == "big-pickle" {
		return "opencode"
	}
	return "prism"
}

func parseClientApp(ua string) string {
	if ua == "" {
		return "API Client"
	}
	uaLower := strings.ToLower(ua)
	if strings.Contains(uaLower, "opencode") {
		return "OpenCode"
	}
	if strings.Contains(uaLower, "antigravity") || strings.Contains(uaLower, "agy") {
		return "Antigravity"
	}
	if strings.Contains(uaLower, "claude-code") || strings.Contains(uaLower, "claudecode") {
		return "Claude Code"
	}
	if strings.Contains(uaLower, "python") {
		return "Python SDK"
	}
	if strings.Contains(uaLower, "node") || strings.Contains(uaLower, "axios") {
		return "Node.js SDK"
	}
	if strings.Contains(uaLower, "mozilla") || strings.Contains(uaLower, "chrome") || strings.Contains(uaLower, "safari") {
		return "Web Sandbox"
	}
	return "Custom App"
}

func (h *GatewayHandler) recordAuditTrail(c *gin.Context, log *models.RequestLog, gatewayKey *models.GatewayAPIKey) {
	if h.auditRecorder == nil || log == nil {
		return
	}

	agentID := c.GetHeader("X-Prism-Agent-ID")
	agentName := agentID
	if agentName == "" {
		agentName = "general-agent"
	}

	userRole := c.GetHeader("X-Prism-Role")
	if userRole == "" {
		userRole = "developer"
	}

	promptHash := utils.HashSHA256(log.Model + ":" + log.RequestID)
	responseHash := utils.HashSHA256(log.Model + ":" + log.ProviderType + ":" + fmt.Sprintf("%d", log.TotalTokens))

	trail := &models.AIAuditTrail{
		RequestID:         log.RequestID,
		UserID:            gatewayKey.UserID,
		UserRole:          userRole,
		ModelSlug:         log.Model,
		FailoverChain:     []string{},
		ToolsInvoked:      []string{},
		ResourcesAccessed: []string{},
		MCPServersCalled:  []string{},
		PromptTokens:      log.InputTokens,
		CompletionTokens:  log.OutputTokens,
		TotalTokens:       log.TotalTokens,
		TotalCostUSD:      log.CostUSD,
		StatusCode:        log.StatusCode,
		LatencyMS:         log.LatencyMs,
		TTFTMS:            log.TTFTMs,
		PromptHash:        promptHash,
		ResponseHash:      responseHash,
		ComplianceStatus:  "compliant",
	}

	if gatewayKey.ID != "" {
		trail.GatewayKeyID = &gatewayKey.ID
	}
	if agentID != "" {
		trail.AgentID = &agentID
		trail.AgentName = &agentName
	}

	_ = h.auditRecorder.Record(c.Request.Context(), trail)
}
