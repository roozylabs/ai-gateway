package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/httputil"
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
		httputil.RespondError(c, http.StatusUnauthorized, "Unauthorized session", nil, "AUTH_REQUIRED")
		return
	}

	user, err := h.userRepo.FindByID(c.Request.Context(), userID)
	if err != nil || user == nil {
		httputil.RespondError(c, http.StatusUnauthorized, "User session not found", err, "USER_NOT_FOUND")
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
			httputil.RespondError(c, http.StatusInternalServerError, "Failed to resolve user permissions", err, "RBAC_RESOLVE_FAILED")
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
		httputil.RespondError(c, http.StatusUnauthorized, "Unauthorized session", nil, "AUTH_REQUIRED")
		return
	}

	orgs, err := h.rbacRepo.ListUserOrganizations(c.Request.Context(), userID)
	if err != nil {
		httputil.RespondError(c, http.StatusInternalServerError, "Failed to list user organizations", err, "ORG_LIST_FAILED")
		return
	}
	if orgs == nil {
		orgs = []models.Organization{}
	}
	c.JSON(http.StatusOK, gin.H{"data": orgs})
}
