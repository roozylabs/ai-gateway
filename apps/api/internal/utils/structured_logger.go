package utils

import (
	"encoding/json"
	"fmt"
	"os"
	"time"
)

type StructuredLogEntry struct {
	Timestamp         string  `json:"timestamp"`
	Level             string  `json:"level"`
	Service           string  `json:"service"`
	Message           string  `json:"message,omitempty"`
	RequestID         string  `json:"request_id,omitempty"`
	ExecutionID       string  `json:"execution_id,omitempty"`
	RoutingDecisionID string  `json:"routing_decision_id,omitempty"`
	AttemptID         string  `json:"attempt_id,omitempty"`
	OrganizationID    string  `json:"organization_id,omitempty"`
	WorkspaceID       string  `json:"workspace_id,omitempty"`
	ProjectID         string  `json:"project_id,omitempty"`
	AgentID           string  `json:"agent_id,omitempty"`
	Provider          string  `json:"provider,omitempty"`
	Model             string  `json:"model,omitempty"`
	Status            string  `json:"status,omitempty"`
	LatencyMS         int64   `json:"latency_ms,omitempty"`
	TTFTMS            int64   `json:"ttft_ms,omitempty"`
	Tokens            int     `json:"tokens,omitempty"`
	CostUSD           float64 `json:"cost_usd,omitempty"`
	ErrorCode         string  `json:"error_code,omitempty"`
}

// LogStructured emits a JSON formatted log entry with secret redaction.
func LogStructured(entry StructuredLogEntry) {
	entry.Timestamp = time.Now().UTC().Format(time.RFC3339Nano)
	if entry.Service == "" {
		entry.Service = "prism-gateway"
	}
	if entry.Level == "" {
		entry.Level = "INFO"
	}

	// Redact secrets across string fields
	entry.Message = RedactSensitive(entry.Message)
	entry.RequestID = RedactSensitive(entry.RequestID)
	entry.ExecutionID = RedactSensitive(entry.ExecutionID)
	entry.RoutingDecisionID = RedactSensitive(entry.RoutingDecisionID)
	entry.AttemptID = RedactSensitive(entry.AttemptID)
	entry.OrganizationID = RedactSensitive(entry.OrganizationID)
	entry.WorkspaceID = RedactSensitive(entry.WorkspaceID)
	entry.ProjectID = RedactSensitive(entry.ProjectID)
	entry.AgentID = RedactSensitive(entry.AgentID)
	entry.Provider = RedactSensitive(entry.Provider)
	entry.Model = RedactSensitive(entry.Model)
	entry.ErrorCode = RedactSensitive(entry.ErrorCode)

	data, err := json.Marshal(entry)
	if err == nil {
		_, _ = fmt.Fprintln(os.Stdout, string(data))
	}
}
