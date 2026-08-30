package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/repository"
)

type OrganizationMemberHandler struct {
	rbacRepo *repository.RBACRepository
}

func NewOrganizationMemberHandler(rbacRepo *repository.RBACRepository) *OrganizationMemberHandler {
	return &OrganizationMemberHandler{
		rbacRepo: rbacRepo,
	}
}

// ListMembers returns all active team members in the caller's active organization.
func (h *OrganizationMemberHandler) ListMembers(c *gin.Context) {
	orgID := c.GetString("organization_id")
	if orgID == "" {
		orgID = c.GetString("organizationId")
	}
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organization context is required"})
		return
	}

	members, err := h.rbacRepo.ListOrganizationMembers(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list organization members: " + err.Error()})
		return
	}
	if members == nil {
		members = []models.OrganizationMember{}
	}

	c.JSON(http.StatusOK, gin.H{
		"object": "list",
		"data":   members,
	})
}

type InviteMemberRequest struct {
	Email string `json:"email" binding:"required,email"`
	Role  string `json:"role" binding:"required"`
}

// InviteMember creates a pending invitation for a new member.
func (h *OrganizationMemberHandler) InviteMember(c *gin.Context) {
	orgID := c.GetString("organization_id")
	if orgID == "" {
		orgID = c.GetString("organizationId")
	}
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organization context is required"})
		return
	}

	var req InviteMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid invitation payload: " + err.Error()})
		return
	}

	invite := &models.MemberInvite{
		OrganizationID: orgID,
		Email:          req.Email,
	}

	if err := h.rbacRepo.CreateInvite(c.Request.Context(), invite); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create invite: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Invitation created successfully",
		"invite":  invite,
	})
}

type UpdateMemberRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// UpdateMemberRole modifies a member's role while enforcing Last-Owner invariant safety.
func (h *OrganizationMemberHandler) UpdateMemberRole(c *gin.Context) {
	orgID := c.GetString("organization_id")
	if orgID == "" {
		orgID = c.GetString("organizationId")
	}
	targetUserID := c.Param("userId")

	if orgID == "" || targetUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organizationId and userId are required"})
		return
	}

	var req UpdateMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role is required"})
		return
	}

	err := h.rbacRepo.UpdateMemberRole(c.Request.Context(), orgID, targetUserID, req.Role)
	if err != nil {
		if errors.Is(err, repository.ErrCannotDemoteLastOwner) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"message": "Cannot demote the last owner of the organization. Transfer ownership or assign another owner first.",
					"type":    "owner_safety_invariant_violation",
				},
			})
			return
		}
		if errors.Is(err, repository.ErrNotMember) {
			c.JSON(http.StatusNotFound, gin.H{"error": "member not found in organization"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update member role: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Member role updated successfully",
		"userId":  targetUserID,
		"role":    req.Role,
	})
}

// RemoveMember removes a user from the organization while enforcing Last-Owner invariant safety.
func (h *OrganizationMemberHandler) RemoveMember(c *gin.Context) {
	orgID := c.GetString("organization_id")
	if orgID == "" {
		orgID = c.GetString("organizationId")
	}
	targetUserID := c.Param("userId")

	if orgID == "" || targetUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organizationId and userId are required"})
		return
	}

	err := h.rbacRepo.RemoveOrganizationMember(c.Request.Context(), orgID, targetUserID)
	if err != nil {
		if errors.Is(err, repository.ErrCannotRemoveLastOwner) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"message": "Cannot remove the last owner of the organization. Transfer ownership first.",
					"type":    "owner_safety_invariant_violation",
				},
			})
			return
		}
		if errors.Is(err, repository.ErrNotMember) {
			c.JSON(http.StatusNotFound, gin.H{"error": "member not found in organization"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove member: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Member removed successfully from organization",
		"userId":  targetUserID,
	})
}
