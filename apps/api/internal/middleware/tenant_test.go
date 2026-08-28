package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/middleware"
	"github.com/roozylabs/prism/internal/models"
	"github.com/stretchr/testify/assert"
)

type mockOrgChecker struct {
	allowedOrgs map[string]map[string]bool // userID -> orgID -> bool
}

func (m *mockOrgChecker) IsMember(ctx context.Context, userID, orgID string) (bool, error) {
	if userOrgs, ok := m.allowedOrgs[userID]; ok {
		return userOrgs[orgID], nil
	}
	return false, nil
}

func TestTenantMiddleware_CrossOrgHeaderSpoofing_GatewayKey_Forbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	orgA := "org_A"
	r.Use(func(c *gin.Context) {
		c.Set("gatewayKey", &models.GatewayAPIKey{
			ID:    "key_123",
			OrgID: &orgA,
		})
		c.Next()
	})
	r.Use(middleware.TenantMiddleware(nil))
	r.GET("/test", func(c *gin.Context) {
		tc := middleware.GetTenantContext(c)
		c.JSON(http.StatusOK, tc)
	})

	// Client sends header for Org B while key belongs to Org A
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Prism-Org-ID", "org_B")
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusForbidden, resp.Code)
}

func TestTenantMiddleware_SessionUser_UnassignedOrgHeader_Forbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	checker := &mockOrgChecker{
		allowedOrgs: map[string]map[string]bool{
			"user_1": {"org_A": true},
		},
	}

	r.Use(func(c *gin.Context) {
		c.Set("userId", "user_1")
		c.Next()
	})
	r.Use(middleware.TenantMiddleware(checker))
	r.GET("/test", func(c *gin.Context) {
		tc := middleware.GetTenantContext(c)
		c.JSON(http.StatusOK, tc)
	})

	// User 1 requests Org B which they do not belong to
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Prism-Org-ID", "org_B")
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusForbidden, resp.Code)
}

func TestTenantMiddleware_SessionUser_ValidOrgHeader_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	checker := &mockOrgChecker{
		allowedOrgs: map[string]map[string]bool{
			"user_1": {"org_A": true},
		},
	}

	r.Use(func(c *gin.Context) {
		c.Set("userId", "user_1")
		c.Next()
	})
	r.Use(middleware.TenantMiddleware(checker))
	r.GET("/test", func(c *gin.Context) {
		tc := middleware.GetTenantContext(c)
		c.JSON(http.StatusOK, tc)
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Prism-Org-ID", "org_A")
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusOK, resp.Code)
}
