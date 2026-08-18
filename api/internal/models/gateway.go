package models

import "time"

type Provider struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"userId" db:"user_id"`
	Name      string    `json:"name" db:"name"`
	Slug      string    `json:"slug" db:"slug"`
	BaseURL   string    `json:"baseUrl" db:"base_url"`
	Type      string    `json:"type" db:"type"`
	Enabled   bool      `json:"enabled" db:"enabled"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

type Credential struct {
	ID             string     `json:"id" db:"id"`
	ProviderID     string     `json:"providerId" db:"provider_id"`
	Name           string     `json:"name" db:"name"`
	EncryptedKey   string     `json:"-" db:"encrypted_key"`
	KeyPrefix      string     `json:"keyPrefix" db:"key_prefix"`
	Priority       int        `json:"priority" db:"priority"`
	Enabled        bool       `json:"enabled" db:"enabled"`
	Status         string     `json:"status" db:"status"`
	LastUsedAt     *time.Time `json:"lastUsedAt,omitempty" db:"last_used_at"`
	RequestCount   int64      `json:"requestCount" db:"request_count"`
	ErrorCount     int64      `json:"errorCount" db:"error_count"`
	LastError      string     `json:"lastError,omitempty" db:"last_error"`
	LastErrorAt    *time.Time `json:"lastErrorAt,omitempty" db:"last_error_at"`
	CreatedAt      time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time  `json:"updatedAt" db:"updated_at"`
}

type Model struct {
	ID          string    `json:"id" db:"id"`
	ProviderID  string    `json:"providerId" db:"provider_id"`
	Name        string    `json:"name" db:"name"`
	Slug        string    `json:"slug" db:"slug"`
	DisplayName string    `json:"displayName" db:"display_name"`
	Enabled     bool      `json:"enabled" db:"enabled"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time `json:"updatedAt" db:"updated_at"`
}
