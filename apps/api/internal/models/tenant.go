package models

import "time"

// Organization represents a top-level B2B tenant boundary and billing account.
type Organization struct {
	ID                      string    `db:"id" json:"id"`
	Name                    string    `db:"name" json:"name"`
	Slug                    string    `db:"slug" json:"slug"`
	PlanTier                string    `db:"plan_tier" json:"plan_tier"`
	MaxWorkspaces           int       `db:"max_workspaces" json:"max_workspaces"`
	MaxProjectsPerWorkspace int       `db:"max_projects_per_workspace" json:"max_projects_per_workspace"`
	CreatedAt               time.Time `db:"created_at" json:"created_at"`
	UpdatedAt               time.Time `db:"updated_at" json:"updated_at"`
}

// Workspace represents a department or division within an Organization.
type Workspace struct {
	ID        string    `db:"id" json:"id"`
	OrgID     string    `db:"org_id" json:"org_id"`
	Name      string    `db:"name" json:"name"`
	Slug      string    `db:"slug" json:"slug"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// Project represents a specific project container within a Workspace.
type Project struct {
	ID          string    `db:"id" json:"id"`
	WorkspaceID string    `db:"workspace_id" json:"workspace_id"`
	Name        string    `db:"name" json:"name"`
	Slug        string    `db:"slug" json:"slug"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

// OrganizationMember links a User to an Organization with a specific RBAC Role.
type OrganizationMember struct {
	ID        string    `db:"id" json:"id"`
	OrgID     string    `db:"org_id" json:"org_id"`
	UserID    string    `db:"user_id" json:"user_id"`
	Role      string    `db:"role" json:"role"` // 'owner', 'admin', 'developer', 'billing_manager', 'auditor'
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// TenantContext encapsulates active tenant boundaries attached to HTTP requests.
type TenantContext struct {
	OrgID       string `json:"org_id"`
	WorkspaceID string `json:"workspace_id"`
	ProjectID   string `json:"project_id"`
	Role        string `json:"role,omitempty"`
}
