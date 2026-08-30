package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
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
		orgID = c.GetString("organization_id")
	}
	if orgID == "" {
		orgID = user.OrgID
	}

	primaryRole := user.PrimaryRole

	var perms []string
	var roleSlug string

	if orgID != "" {
		p, rSlug, err := h.rbacRepo.GetUserPermissions(c.Request.Context(), userID, orgID)
		if err == nil {
			perms = p
			roleSlug = rSlug
		} else if errors.Is(err, repository.ErrNotMember) {
			// Fail-closed: User is not a member of the requested organization
			perms = []string{}
			roleSlug = ""
		} else {
			// Fail-closed: Database or internal error
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"message": "Failed to resolve permissions: " + err.Error(), "type": "rbac_error"},
			})
			return
		}
	} else {
		perms = []string{}
		roleSlug = ""
	}

	if perms == nil {
		perms = []string{}
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
	if orgs == nil {
		orgs = []models.Organization{}
	}
	c.JSON(http.StatusOK, gin.H{"data": orgs})
}
