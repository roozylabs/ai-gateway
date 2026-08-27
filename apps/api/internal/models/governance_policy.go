package models

import (
	"time"
)

type GovernancePolicy struct {
	ID              string    `json:"id"`
	UserID          string    `json:"userId"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	Role            string    `json:"role"`
	Effect          string    `json:"effect"` // "allow" | "deny"
	AgentPattern    string    `json:"agentPattern"`
	ModelPattern    string    `json:"modelPattern"`
	ToolPattern     string    `json:"toolPattern"`
	ResourcePattern string    `json:"resourcePattern"`
	Priority        int       `json:"priority"`
	Enabled         bool      `json:"enabled"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type RBACEvaluationRequest struct {
	Role         string `json:"role"`
	AgentName    string `json:"agentName"`
	ModelSlug    string `json:"modelSlug"`
	ToolName     string `json:"toolName"`
	ResourceName string `json:"resourceName"`
	UserPrompt   string `json:"userPrompt"`
}

type RBACEvaluationResult struct {
	Allowed        bool              `json:"allowed"`
	MatchedPolicy  *GovernancePolicy `json:"matchedPolicy,omitempty"`
	Reason         string            `json:"reason"`
	EvaluatedCount int               `json:"evaluatedCount"`
}
