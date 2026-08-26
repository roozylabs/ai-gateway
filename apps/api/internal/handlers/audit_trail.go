package handlers

import (
	"fmt"
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

func (h *AuditTrailHandler) ListLogs(c *gin.Context) {
	orgID := c.GetString("organizationId")
	action := c.Query("action")
	status := c.Query("status")
	search := c.Query("search")

	limit := 50
	if l := c.Query("limit"); l != "" {
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

	req := models.AuditExportRequest{
		Action: action,
		Status: status,
		Search: search,
	}

	logs, total, err := h.repo.ListAuditLogs(c.Request.Context(), orgID, req, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query audit logs: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     logs,
		"total":    total,
		"page":     page,
		"pageSize": limit,
	})
}

func (h *AuditTrailHandler) ExportLogs(c *gin.Context) {
	orgID := c.GetString("organizationId")
	format := c.DefaultQuery("format", "csv")
	action := c.Query("action")
	status := c.Query("status")
	search := c.Query("search")

	req := models.AuditExportRequest{
		Format: format,
		Action: action,
		Status: status,
		Search: search,
	}

	logs, _, err := h.repo.ListAuditLogs(c.Request.Context(), orgID, req, 1000, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export audit logs: " + err.Error()})
		return
	}

	if format == "json" {
		c.Header("Content-Disposition", "attachment; filename=\"prism_audit_report.json\"")
		c.JSON(http.StatusOK, gin.H{
			"object":    "list",
			"data":      logs,
			"exportedAt": time.Now().Format(time.RFC3339),
		})
		return
	}

	// Default CSV export format
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=\"prism_audit_report.csv\"")

	csvData := "ID,Timestamp,ActorEmail,Action,Resource,ResourceID,Status,ActorIP,UserAgent\n"
	for _, l := range logs {
		csvData += fmt.Sprintf("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
			l.ID, l.CreatedAt.Format(time.RFC3339), l.ActorEmail, l.Action, l.Resource, l.ResourceID, l.Status, l.ActorIP, l.ActorUserAgent)
	}

	c.String(http.StatusOK, csvData)
}
