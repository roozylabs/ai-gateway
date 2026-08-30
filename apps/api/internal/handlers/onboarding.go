package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/roozylabs/prism/internal/repository"
)

type OnboardingHandler struct {
	db       *sql.DB
	userRepo *repository.UserRepository
	keyRepo  *repository.GatewayKeyRepository
}

func NewOnboardingHandler(db *sql.DB, userRepo *repository.UserRepository, keyRepo *repository.GatewayKeyRepository) *OnboardingHandler {
	return &OnboardingHandler{
		db:       db,
		userRepo: userRepo,
		keyRepo:  keyRepo,
	}
}

type OnboardingRequest struct {
	OrganizationName string `json:"organizationName"`
	WorkspaceName    string `json:"workspaceName"`
	GatewayKeyName   string `json:"gatewayKeyName"`
	InitialProvider  string `json:"initialProvider"`
	InitialApiKey    string `json:"initialApiKey"`
	PrimaryRole      string `json:"primaryRole"`
}

func (h *OnboardingHandler) Complete(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{"message": "Unauthorized", "type": "auth_error"},
		})
		return
	}

	var req OnboardingRequest
	_ = c.ShouldBindJSON(&req)

	orgName := strings.TrimSpace(req.OrganizationName)
	if orgName == "" {
		orgName = "RoozyLabs Enterprise"
	}
	wsName := strings.TrimSpace(req.WorkspaceName)
	if wsName == "" {
		wsName = "Production Environment"
	}
	keyName := strings.TrimSpace(req.GatewayKeyName)
	if keyName == "" {
		keyName = "Primary Control Key"
	}
	role := strings.TrimSpace(req.PrimaryRole)
	if role == "" {
		role = "owner"
	}

	ctx := c.Request.Context()
	orgID := "org_" + strings.ReplaceAll(uuid.New().String(), "-", "")[:16]
	wsID := "ws_" + strings.ReplaceAll(uuid.New().String(), "-", "")[:16]
	memberID := "mem_" + strings.ReplaceAll(uuid.New().String(), "-", "")[:16]
	orgSlug := strings.ToLower(strings.ReplaceAll(orgName, " ", "-")) + "-" + orgID[4:8]
	wsSlug := strings.ToLower(strings.ReplaceAll(wsName, " ", "-")) + "-" + wsID[3:7]

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to begin onboarding transaction: " + err.Error()})
		return
	}
	defer func() { _ = tx.Rollback() }()

	// 1. Create Organization
	_, err = tx.ExecContext(ctx,
		`INSERT INTO organizations (id, name, slug, plan_tier, created_at, updated_at)
		 VALUES ($1, $2, $3, 'free', NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		orgID, orgName, orgSlug,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create organization: " + err.Error()})
		return
	}

	// 2. Create Workspace
	_, err = tx.ExecContext(ctx,
		`INSERT INTO workspaces (id, org_id, name, slug, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, NOW(), NOW())
		 ON CONFLICT (org_id, slug) DO NOTHING`,
		wsID, orgID, wsName, wsSlug,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workspace: " + err.Error()})
		return
	}

	// 3. Add user as owner in organization_members
	_, err = tx.ExecContext(ctx,
		`INSERT INTO organization_members (id, org_id, user_id, role, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, NOW(), NOW())
		 ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
		memberID, orgID, userID, role,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign organization membership: " + err.Error()})
		return
	}

	// 4. Create initial Gateway Key
	rawKey := "gw_sk_live_" + strings.ReplaceAll(uuid.New().String(), "-", "")
	keyID := uuid.New().String()
	_, err = tx.ExecContext(ctx,
		`INSERT INTO gateway_api_keys (id, user_id, org_id, workspace_id, name, key_hash, key_prefix, enabled, rate_limit, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, true, 600, NOW(), NOW())`,
		keyID, userID, orgID, wsID, keyName, rawKey, rawKey[:14],
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create gateway key: " + err.Error()})
		return
	}

	// 5. Update user onboarding status
	_, err = tx.ExecContext(ctx,
		`UPDATE "user" SET is_onboarded = true, org_id = $1, primary_role = $2, updated_at = NOW() WHERE id = $3`,
		orgID, role, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user onboarding status: " + err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit onboarding transaction: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"message":        "Onboarding completed successfully",
		"organizationId": orgID,
		"workspaceId":    wsID,
		"workspaceName":  wsName,
		"primaryRole":    role,
		"apiKey":         rawKey,
	})
}
