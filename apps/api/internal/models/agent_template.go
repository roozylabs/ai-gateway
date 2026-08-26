package models

import (
	"encoding/json"
	"time"
)

type AgentTemplate struct {
	ID               string          `json:"id" db:"id"`
	UserID           *string         `json:"userId,omitempty" db:"user_id"`
	Name             string          `json:"name" db:"name"`
	Slug             string          `json:"slug" db:"slug"`
	Role             string          `json:"role" db:"role"`
	Description      string          `json:"description" db:"description"`
	Icon             string          `json:"icon" db:"icon"`
	AllowedModels    json.RawMessage `json:"allowedModels" db:"allowed_models"`
	AllowedTools     json.RawMessage `json:"allowedTools" db:"allowed_tools"`
	AllowedResources json.RawMessage `json:"allowedResources" db:"allowed_resources"`
	MaxBudgetCents   int             `json:"maxBudgetCents" db:"max_budget_cents"`
	IsPreset         bool            `json:"isPreset" db:"is_preset"`
	CreatedAt        time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt        time.Time       `json:"updatedAt" db:"updated_at"`
}
