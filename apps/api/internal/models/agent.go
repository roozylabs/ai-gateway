package models

import (
	"time"
)

type Agent struct {
	ID                   string    `json:"id"`
	UserID               string    `json:"userId"`
	Name                 string    `json:"name"`
	DisplayName          string    `json:"displayName"`
	Description          string    `json:"description"`
	AgentType            string    `json:"agentType"`
	SystemPromptOverride string    `json:"systemPromptOverride"`
	AllowedModels        []string  `json:"allowedModels"`
	AllowedTools         []string  `json:"allowedTools"`
	AllowedResources     []string  `json:"allowedResources"`
	AllowedMCPServers    []string  `json:"allowedMcpServers"`
	MaxBudgetCents       int       `json:"maxBudgetCents"`
	Status               string    `json:"status"`
	Enabled              bool      `json:"enabled"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

type AgentGovernanceCheckResult struct {
	AgentName       string `json:"agentName"`
	ModelAllowed    bool   `json:"modelAllowed"`
	ToolAllowed     bool   `json:"toolAllowed"`
	ResourceAllowed bool   `json:"resourceAllowed"`
	Reason          string `json:"reason,omitempty"`
}

type AgentStats struct {
	TotalRequests  int     `json:"totalRequests"`
	TotalTokens    int     `json:"totalTokens"`
	TotalCostUSD   float64 `json:"totalCostUSD"`
	AvgLatencyMs   int     `json:"avgLatencyMs"`
	SuccessRate    float64 `json:"successRate"`
	ToolCallsCount int     `json:"toolCallsCount"`
}
