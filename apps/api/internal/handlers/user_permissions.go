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
	orgID := c.GetString("organizationId")
	if orgID == "" {
		orgID = "org_default"
	}

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{"message": "Unauthorized", "type": "auth_error"},
		})
		return
	}

	user, err := h.userRepo.FindByID(c.Request.Context(), userID)
	isOnboarded := false
	primaryRole := "developer"
	if err == nil && user != nil {
		isOnboarded = true
	}

	perms, roleSlug, err := h.rbacRepo.GetUserPermissions(c.Request.Context(), userID, orgID)
	if err != nil {
		perms = []string{"org:read", "logs:read"}
		roleSlug = "viewer"
	}

	c.JSON(http.StatusOK, gin.H{
		"userId":         userID,
		"organizationId": orgID,
		"roleSlug":       roleSlug,
		"isOnboarded":    isOnboarded,
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
