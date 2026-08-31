package models

import (
	"encoding/json"
	"time"
)

type Resource struct {
	ID               string          `json:"id" db:"id"`
	OrgID            string          `json:"orgId,omitempty" db:"org_id"`
	WorkspaceID      string          `json:"workspaceId,omitempty" db:"workspace_id"`
	UserID           string          `json:"userId" db:"user_id"`
	Name             string          `json:"name" db:"name"`
	DisplayName      string          `json:"displayName" db:"display_name"`
	Description      string          `json:"description" db:"description"`
	ParametersSchema json.RawMessage `json:"parametersSchema" db:"parameters_schema"`
	Enabled          bool            `json:"enabled" db:"enabled"`
	CreatedAt        time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt        time.Time       `json:"updatedAt" db:"updated_at"`
}

type ResourceBackend struct {
	ID                        string  `json:"id" db:"id"`
	ResourceID                string  `json:"resourceId" db:"resource_id"`
	Name                      string  `json:"name" db:"name"`
	BackendType               string  `json:"backendType" db:"backend_type"`
	EndpointURL               *string `json:"endpointUrl,omitempty" db:"endpoint_url"`
	HTTPMethod                string  `json:"httpMethod" db:"http_method"`
	AuthTokenEncrypted        *string `json:"-" db:"auth_token_encrypted"`
	AuthHeaderName            string  `json:"authHeaderName" db:"auth_header_name"`
	AuthHeaderPrefix          string  `json:"authHeaderPrefix" db:"auth_header_prefix"`
	QueryTemplate             *string `json:"queryTemplate,omitempty" db:"query_template"`
	ConnectionStringEncrypted *string `json:"-" db:"connection_string_encrypted"`
	SQLQuery                  *string `json:"sqlQuery,omitempty" db:"sql_query"`
	ParamNames                []string `json:"paramNames,omitempty" db:"param_names"`
	TimeoutMs                 int     `json:"timeoutMs" db:"timeout_ms"`
	Priority                  int     `json:"priority" db:"priority"`
	Enabled                   bool    `json:"enabled" db:"enabled"`
	CreatedAt                 time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt                 time.Time `json:"updatedAt" db:"updated_at"`
}

type ResourceWithBackends struct {
	Resource Resource         `json:"resource"`
	Backends []ResourceBackend `json:"backends"`
}

type ResourceExecutionResult struct {
	Resource   string      `json:"resource"`
	Backend    string      `json:"backend"`
	BackendType string     `json:"backendType"`
	StatusCode int         `json:"statusCode,omitempty"`
	Data       interface{} `json:"data"`
	RowCount   int         `json:"rowCount"`
	LatencyMs  int         `json:"latencyMs"`
}
