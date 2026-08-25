package models

import (
	"time"

	"github.com/lib/pq"
)

type AIAuditTrail struct {
	ID                string         `json:"id"`
	RequestID         string         `json:"requestId"`
	UserID            string         `json:"userId"`
	GatewayKeyID      *string        `json:"gatewayKeyId,omitempty"`
	AgentID           *string        `json:"agentId,omitempty"`
	AgentName         *string        `json:"agentName,omitempty"`
	UserRole          string         `json:"userRole"`
	ModelSlug         string         `json:"modelSlug"`
	FailoverChain     pq.StringArray `json:"failoverChain"`
	ToolsInvoked      pq.StringArray `json:"toolsInvoked"`
	ResourcesAccessed pq.StringArray `json:"resourcesAccessed"`
	MCPServersCalled  pq.StringArray `json:"mcpServersCalled"`
	PromptTokens      int            `json:"promptTokens"`
	CompletionTokens  int            `json:"completionTokens"`
	TotalTokens       int            `json:"totalTokens"`
	TotalCostUSD      float64        `json:"totalCostUsd"`
	StatusCode        int            `json:"statusCode"`
	LatencyMS         int            `json:"latencyMs"`
	TTFTMS            int            `json:"ttftMs"`
	PromptHash        string         `json:"promptHash"`
	ResponseHash      string         `json:"responseHash"`
	ComplianceStatus  string         `json:"complianceStatus"` // "compliant" | "flagged" | "denied"
	SignatureHash     string         `json:"signatureHash"`
	CreatedAt         time.Time      `json:"createdAt"`
}

type AuditTrailFilter struct {
	UserID           string     `json:"userId"`
	AgentName        string     `json:"agentName"`
	ModelSlug        string     `json:"modelSlug"`
	ComplianceStatus string     `json:"complianceStatus"`
	StartDate        *time.Time `json:"startDate"`
	EndDate          *time.Time `json:"endDate"`
	Limit            int        `json:"limit"`
	Offset           int        `json:"offset"`
}

type AuditVerificationResult struct {
	AuditID       string `json:"auditId"`
	RequestID     string `json:"requestId"`
	Valid         bool   `json:"valid"`
	SignatureHash string `json:"signatureHash"`
	ExpectedHash  string `json:"expectedHash"`
	Message       string `json:"message"`
}
