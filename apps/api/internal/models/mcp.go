package models

import (
	"encoding/json"
	"time"
)

type MCPServer struct {
	ID                 string    `json:"id"`
	UserID             string    `json:"userId"`
	Name               string    `json:"name"`
	DisplayName        string    `json:"displayName"`
	Description        string    `json:"description"`
	TransportType      string    `json:"transportType"`
	EndpointURL        string    `json:"endpointUrl"`
	AuthTokenEncrypted *string   `json:"-"`
	HasAuthToken       bool      `json:"hasAuthToken"`
	Status             string    `json:"status"`
	Enabled            bool      `json:"enabled"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

type MCPTool struct {
	ID          string          `json:"id"`
	MCPServerID string          `json:"mcpServerId"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"inputSchema"`
	Enabled     bool            `json:"enabled"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

type MCPServerWithTools struct {
	Server MCPServer `json:"server"`
	Tools  []MCPTool `json:"tools"`
}

type MCPToolExecutionResult struct {
	Server     string      `json:"server"`
	Tool       string      `json:"tool"`
	StatusCode int         `json:"statusCode"`
	Result     interface{} `json:"result"`
	LatencyMs  int         `json:"latencyMs"`
}
