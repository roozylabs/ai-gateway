package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/proxy"
	"github.com/roozylabs/prism/internal/repository"
)

type AuditTrailHandler struct {
	repo          *repository.AuditTrailRepository
	auditRecorder *proxy.AuditRecorder
}

func NewAuditTrailHandler(repo *repository.AuditTrailRepository, auditRecorder *proxy.AuditRecorder) *AuditTrailHandler {
	return &AuditTrailHandler{repo: repo, auditRecorder: auditRecorder}
}

func (h *AuditTrailHandler) List(c *gin.Context) {
	userID := c.GetString("userId")
	agentName := c.Query("agentName")
	modelSlug := c.Query("modelSlug")
	complianceStatus := c.Query("complianceStatus")

	limit := 50
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

	var startDate, endDate *time.Time
	if s := c.Query("startDate"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			startDate = &t
		}
	}
	if e := c.Query("endDate"); e != "" {
		if t, err := time.Parse(time.RFC3339, e); err == nil {
			endDate = &t
		}
	}

	filter := models.AuditTrailFilter{
		UserID:           userID,
		AgentName:        agentName,
		ModelSlug:        modelSlug,
		ComplianceStatus: complianceStatus,
		StartDate:        startDate,
		EndDate:          endDate,
		Limit:            limit,
		Offset:           offset,
	}

	trails, total, err := h.repo.ListWithFilter(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list audit trails: " + err.Error()})
		return
	}
	if trails == nil {
		trails = []models.AIAuditTrail{}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     trails,
		"total":    total,
		"page":     page,
		"pageSize": limit,
	})
}

func (h *AuditTrailHandler) Get(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	trail, err := h.repo.FindByID(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "audit trail record not found"})
		return
	}
	c.JSON(http.StatusOK, trail)
}

func (h *AuditTrailHandler) Verify(c *gin.Context) {
	userID := c.GetString("userId")
	id := c.Param("id")
	result, err := h.auditRecorder.VerifyIntegrity(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "audit record verification failed: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}
