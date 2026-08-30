package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/repository"
)

type UserPermissionsHandler struct {
	rbacRepo *repository.RBACRepository
	userRepo *repository.UserRepository
}

func NewUserPermissionsHandler(rbacRepo *repository.RBACRepository, userRepo *repository.UserRepository) *UserPermissionsHandler {
	return &UserPermissionsHandler{
		rbacRepo: rbacRepo,
		userRepo: userRepo,
	}
}

func (h *UserPermissionsHandler) GetPermissions(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{"message": "Unauthorized", "type": "auth_error"},
		})
		return
	}

	user, err := h.userRepo.FindByID(c.Request.Context(), userID)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{"message": "User not found", "type": "auth_error"},
		})
		return
	}

	orgID := c.GetString("organizationId")
	if orgID == "" {
		orgID = user.OrgID
	}
	if orgID == "" {
		orgID = "org_default"
	}

	primaryRole := user.PrimaryRole
	if primaryRole == "" {
		primaryRole = "developer"
	}

	perms, roleSlug, err := h.rbacRepo.GetUserPermissions(c.Request.Context(), userID, orgID)
	if err != nil || len(perms) == 0 {
		if user.IsOnboarded {
			perms = []string{"org:read", "logs:read", "api_keys:read", "models:read"}
			roleSlug = "developer"
		} else {
			perms = []string{}
			roleSlug = "viewer"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"userId":         userID,
		"organizationId": orgID,
		"roleSlug":       roleSlug,
		"isOnboarded":    user.IsOnboarded,
		"primaryRole":    primaryRole,
		"permissions":    perms,
	})
}

func (h *UserPermissionsHandler) GetOrganizations(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	orgs, err := h.rbacRepo.ListUserOrganizations(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list organizations"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": orgs})
}
