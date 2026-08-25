package models

import (
	"encoding/json"
	"time"
)

type Tool struct {
	ID          string          `json:"id" db:"id"`
	UserID      string          `json:"userId" db:"user_id"`
	Name        string          `json:"name" db:"name"`
	DisplayName string          `json:"displayName" db:"display_name"`
	Description string          `json:"description" db:"description"`
	InputSchema json.RawMessage `json:"inputSchema" db:"input_schema"`
	Enabled     bool            `json:"enabled" db:"enabled"`
	CreatedAt   time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time       `json:"updatedAt" db:"updated_at"`
}

type ToolBackend struct {
	ID                 string    `json:"id" db:"id"`
	ToolID             string    `json:"toolId" db:"tool_id"`
	Name               string    `json:"name" db:"name"`
	BackendType        string    `json:"backendType" db:"backend_type"`
	EndpointURL        string    `json:"endpointUrl" db:"endpoint_url"`
	AuthTokenEncrypted *string   `json:"-" db:"auth_token_encrypted"`
	AuthHeaderName     string    `json:"authHeaderName" db:"auth_header_name"`
	AuthHeaderPrefix   string    `json:"authHeaderPrefix" db:"auth_header_prefix"`
	TimeoutMs          int       `json:"timeoutMs" db:"timeout_ms"`
	Priority           int       `json:"priority" db:"priority"`
	Enabled            bool      `json:"enabled" db:"enabled"`
	CreatedAt          time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt          time.Time `json:"updatedAt" db:"updated_at"`
}

type ToolWithBackends struct {
	Tool     Tool          `json:"tool"`
	Backends []ToolBackend `json:"backends"`
}
