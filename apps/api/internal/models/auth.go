package models

import "time"

type User struct {
	ID            string    `json:"id" db:"id"`
	Name          string    `json:"name" db:"name"`
	Email         string    `json:"email" db:"email"`
	EmailVerified bool      `json:"emailVerified" db:"email_verified"`
	Image         string    `json:"image,omitempty" db:"image"`
	OrgID         string    `json:"orgId,omitempty" db:"org_id"`
	IsOnboarded   bool      `json:"isOnboarded" db:"is_onboarded"`
	PrimaryRole   string    `json:"primaryRole,omitempty" db:"primary_role"`
	AuthProvider  string    `json:"authProvider,omitempty" db:"auth_provider"`
	AvatarURL     string    `json:"avatarUrl,omitempty" db:"avatar_url"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time `json:"updatedAt" db:"updated_at"`
}

type Session struct {
	ID        string    `json:"id" db:"id"`
	ExpiresAt time.Time `json:"expiresAt" db:"expires_at"`
	Token     string    `json:"token" db:"token"`
	IPAddress string    `json:"ipAddress,omitempty" db:"ip_address"`
	UserAgent string    `json:"userAgent,omitempty" db:"user_agent"`
	UserID    string    `json:"userId" db:"user_id"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

type Account struct {
	ID         string    `json:"id" db:"id"`
	AccountID  string    `json:"accountId" db:"account_id"`
	ProviderID string    `json:"providerId" db:"provider_id"`
	UserID     string    `json:"userId" db:"user_id"`
	Password   string    `json:"password,omitempty" db:"password"`
	CreatedAt  time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt  time.Time `json:"updatedAt" db:"updated_at"`
}
