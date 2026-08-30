package models

import "time"

type MCPInvocation struct {
	ID           int64     `json:"id"`
	UserID       string    `json:"userId"`
	MCPServerID  string    `json:"mcpServerId"`
	ToolName     string    `json:"toolName"`
	StatusCode   int       `json:"statusCode"`
	IsError      bool      `json:"isError"`
	ErrorMessage *string   `json:"errorMessage"`
	LatencyMs    int       `json:"latencyMs"`
	CreatedAt    time.Time `json:"createdAt"`
}

type MCPToolStat struct {
	Tool         string  `json:"tool"`
	Requests     int64   `json:"requests"`
	Errors       int64   `json:"errors"`
	AvgLatencyMs float64 `json:"avgLatencyMs"`
}

type MCPAgentBinding struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Status      string `json:"status"`
	Enabled     bool   `json:"enabled"`
}

type MCPServerStats struct {
	TotalRequests int64             `json:"totalRequests"`
	SuccessCount  int64             `json:"successCount"`
	ErrorCount    int64             `json:"errorCount"`
	SuccessRate   float64           `json:"successRate"`
	AvgLatencyMs  float64           `json:"avgLatencyMs"`
	Tools         []MCPToolStat     `json:"tools"`
	Agents        []MCPAgentBinding `json:"agents"`
}
