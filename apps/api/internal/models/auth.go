package models

import "time"

type User struct {
	ID            string    `json:"id" db:"id"`
	Name          string    `json:"name" db:"name"`
	Email         string    `json:"email" db:"email"`
	EmailVerified bool      `json:"emailVerified" db:"emailVerified"`
	Image         string    `json:"image,omitempty" db:"image"`
	OrgID         string    `json:"orgId,omitempty" db:"org_id"`
	IsOnboarded   bool      `json:"isOnboarded" db:"is_onboarded"`
	PrimaryRole   string    `json:"primaryRole,omitempty" db:"primary_role"`
	AuthProvider  string    `json:"authProvider,omitempty" db:"auth_provider"`
	CreatedAt     time.Time `json:"createdAt" db:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt" db:"updatedAt"`
}

type Session struct {
	ID        string    `json:"id" db:"id"`
	ExpiresAt time.Time `json:"expiresAt" db:"expiresAt"`
	Token     string    `json:"token" db:"token"`
	IPAddress string    `json:"ipAddress,omitempty" db:"ipAddress"`
	UserAgent string    `json:"userAgent,omitempty" db:"userAgent"`
	UserID    string    `json:"userId" db:"userId"`
	CreatedAt time.Time `json:"createdAt" db:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt" db:"updatedAt"`
}

type Account struct {
	ID         string    `json:"id" db:"id"`
	AccountID  string    `json:"accountId" db:"accountId"`
	ProviderID string    `json:"providerId" db:"providerId"`
	UserID     string    `json:"userId" db:"userId"`
	Password   string    `json:"password,omitempty" db:"password"`
	CreatedAt  time.Time `json:"createdAt" db:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt" db:"updatedAt"`
}
