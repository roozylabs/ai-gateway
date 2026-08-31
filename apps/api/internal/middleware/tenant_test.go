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

type mockOrgCheckerWithPrimary struct {
	allowedOrgs      map[string]map[string]bool // userID -> orgID -> bool
	primaryOrgByUser map[string]string          // userID -> primary orgID
}

func (m *mockOrgCheckerWithPrimary) IsMember(ctx context.Context, userID, orgID string) (bool, error) {
	if userOrgs, ok := m.allowedOrgs[userID]; ok {
		return userOrgs[orgID], nil
	}
	return false, nil
}

func (m *mockOrgCheckerWithPrimary) GetPrimaryOrganization(ctx context.Context, userID string) (string, error) {
	return m.primaryOrgByUser[userID], nil
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

func TestTenantMiddleware_SessionUser_NoHeader_FallbackToPrimaryOrg_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	checker := &mockOrgCheckerWithPrimary{
		allowedOrgs: map[string]map[string]bool{
			"user_1": {"org_A": true},
		},
		primaryOrgByUser: map[string]string{
			"user_1": "org_A",
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

	// No X-Prism-Org-ID header supplied: resolver fallback to primary org
	req, _ := http.NewRequest("GET", "/test", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusOK, resp.Code)
	assert.JSONEq(t, `{"org_id":"org_A","workspace_id":"","project_id":""}`, resp.Body.String())
}

func TestTenantMiddleware_SessionUser_NoHeader_NoPrimaryResolver_Forbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Checker does NOT implement OrgPrimaryResolver
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
		c.JSON(http.StatusOK, gin.H{})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	// Fail-closed: no header and no primary resolver fallback -> 403
	assert.Equal(t, http.StatusForbidden, resp.Code)
}

func TestTenantMiddleware_SessionUser_NoHeader_PrimaryResolverEmpty_Forbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	checker := &mockOrgCheckerWithPrimary{
		allowedOrgs:      map[string]map[string]bool{"user_1": {"org_A": true}},
		primaryOrgByUser: map[string]string{"user_1": ""}, // resolver returns empty
	}

	r.Use(func(c *gin.Context) {
		c.Set("userId", "user_1")
		c.Next()
	})
	r.Use(middleware.TenantMiddleware(checker))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusForbidden, resp.Code)
}

func TestTenantMiddleware_NoSessionUser_NoHeader_Forbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	checker := &mockOrgCheckerWithPrimary{
		allowedOrgs:      map[string]map[string]bool{"user_1": {"org_A": true}},
		primaryOrgByUser: map[string]string{"user_1": "org_A"},
	}

	r.Use(middleware.TenantMiddleware(checker))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	// No user session and no header: strictly fail-closed
	assert.Equal(t, http.StatusForbidden, resp.Code)
}
