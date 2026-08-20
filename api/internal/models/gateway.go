package models

import (
	"database/sql"
	"time"
)

type Provider struct {
	ID               string    `json:"id" db:"id"`
	UserID           string    `json:"userId" db:"user_id"`
	Name             string    `json:"name" db:"name"`
	Slug             string    `json:"slug" db:"slug"`
	BaseURL          string    `json:"baseUrl" db:"base_url"`
	Type             string    `json:"type" db:"type"`
	Enabled          bool      `json:"enabled" db:"enabled"`
	RoutingStrategy  string    `json:"routingStrategy" db:"routing_strategy"`
	CreatedAt        time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt        time.Time `json:"updatedAt" db:"updated_at"`
}

type Credential struct {
	ID             string     `json:"id" db:"id"`
	ProviderID     string     `json:"providerId" db:"provider_id"`
	Name           string     `json:"name" db:"name"`
	EncryptedKey   string     `json:"-" db:"encrypted_key"`
	KeyPrefix      string     `json:"keyPrefix" db:"key_prefix"`
	MaskedKey      string     `json:"maskedKey" db:"masked_key"`
	Priority       int        `json:"priority" db:"priority"`
	Enabled        bool       `json:"enabled" db:"enabled"`
	Status         string     `json:"status" db:"status"`
	LastUsedAt     *time.Time `json:"lastUsedAt,omitempty" db:"last_used_at"`
	RequestCount   int64      `json:"requestCount" db:"request_count"`
	ErrorCount     int64      `json:"errorCount" db:"error_count"`
	LastError      sql.NullString `json:"lastError,omitempty" db:"last_error"`
	LastErrorAt    *time.Time `json:"lastErrorAt,omitempty" db:"last_error_at"`
	CreatedAt      time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time  `json:"updatedAt" db:"updated_at"`
	ProviderName   string     `json:"providerName,omitempty" db:"-"`
	IsCoolingDown  bool       `json:"isCoolingDown,omitempty" db:"-"`
	CooldownTTL    int        `json:"cooldownTtl,omitempty" db:"-"`
}

type Model struct {
	ID           string    `json:"id" db:"id"`
	ProviderID   string    `json:"providerId" db:"provider_id"`
	ProviderName string    `json:"providerName,omitempty" db:"-"`
	Name         string    `json:"name" db:"name"`
	Slug         string    `json:"slug" db:"slug"`
	DisplayName  string    `json:"displayName" db:"display_name"`
	Enabled      bool      `json:"enabled" db:"enabled"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time `json:"updatedAt" db:"updated_at"`
}

type GatewayAPIKey struct {
	ID            string     `json:"id" db:"id"`
	UserID        string     `json:"userId" db:"user_id"`
	ProviderID    *string    `json:"providerId,omitempty" db:"provider_id"`
	Name          string     `json:"name" db:"name"`
	KeyHash       string     `json:"-" db:"key_hash"`
	KeyPrefix     string     `json:"keyPrefix" db:"key_prefix"`
	Enabled       bool       `json:"enabled" db:"enabled"`
	RateLimit     int        `json:"rateLimit" db:"rate_limit"`
	AllowedModels []string   `json:"allowedModels" db:"allowed_models"`
	ExpiresAt     *time.Time `json:"expiresAt,omitempty" db:"expires_at"`
	LastUsedAt    *time.Time `json:"lastUsedAt,omitempty" db:"last_used_at"`
	RequestCount  int64      `json:"requestCount" db:"request_count"`
	CreatedAt     time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time  `json:"updatedAt" db:"updated_at"`
}

type RequestLog struct {
	ID              string         `json:"id" db:"id"`
	RequestID       string         `json:"requestId" db:"request_id"`
	GatewayAPIKeyID *string        `json:"gatewayApiKeyId,omitempty" db:"gateway_api_key_id"`
	ProviderID      *string        `json:"providerId,omitempty" db:"provider_id"`
	CredentialID    *string        `json:"credentialId,omitempty" db:"credential_id"`
	CredentialName  string         `json:"credentialName,omitempty" db:"credential_name"`
	Model           string         `json:"model" db:"model"`
	StatusCode      int            `json:"statusCode" db:"status_code"`
	LatencyMs       int            `json:"latencyMs" db:"latency_ms"`
	InputTokens     int            `json:"inputTokens" db:"input_tokens"`
	OutputTokens    int            `json:"outputTokens" db:"output_tokens"`
	TotalTokens     int            `json:"totalTokens" db:"total_tokens"`
	EstimatedCost   float64        `json:"estimatedCost"`
	ErrorMessage    sql.NullString `json:"errorMessage,omitempty" db:"error_message"`
	RetryCount      int            `json:"retryCount" db:"retry_count"`
	CreatedAt       time.Time      `json:"createdAt" db:"created_at"`
}
