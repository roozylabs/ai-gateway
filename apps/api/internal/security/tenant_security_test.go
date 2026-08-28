package security_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/middleware"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/utils"
	"github.com/stretchr/testify/assert"
)

type mockAccountRepo struct{}

func (m *mockAccountRepo) IsMember(ctx context.Context, userID, orgID string) (bool, error) {
	if userID == "usr_tenant_A" && orgID == "org_A" {
		return true, nil
	}
	return false, nil
}

// Step 1 & 2: Header Spoofing & Auth Org Boundaries
func TestSecurityRegression_HeaderSpoofingRejection(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	orgA := "org_A"
	r.Use(func(c *gin.Context) {
		c.Set("gatewayKey", &models.GatewayAPIKey{
			ID:    "key_org_A",
			OrgID: &orgA,
		})
		c.Next()
	})
	r.Use(middleware.TenantMiddleware(&mockAccountRepo{}))
	r.GET("/v1/chat/completions", func(c *gin.Context) {
		tc := middleware.GetTenantContext(c)
		c.JSON(http.StatusOK, tc)
	})

	// Gateway Key belongs to Org A, but client sends X-Prism-Org-ID: org_B
	req, _ := http.NewRequest("GET", "/v1/chat/completions", nil)
	req.Header.Set("X-Prism-Org-ID", "org_B")
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusForbidden, resp.Code)
}

func TestSecurityRegression_UnassignedOrgSessionRejection(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.Use(func(c *gin.Context) {
		c.Set("userId", "usr_attacker")
		c.Next()
	})
	r.Use(middleware.TenantMiddleware(&mockAccountRepo{}))
	r.GET("/api/credentials", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Attacker tries to access Org A without membership
	req, _ := http.NewRequest("GET", "/api/credentials", nil)
	req.Header.Set("X-Prism-Org-ID", "org_A")
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusForbidden, resp.Code)
}

// Step 8: Secret Exposure & Redaction
func TestSecurityRegression_SecretRedactionInLogs(t *testing.T) {
	errLog := "Error contacting provider: Bearer gw_sk_9999888877776666 with key sk-proj-1122334455667788"
	cleanLog := utils.RedactSensitive(errLog)

	assert.NotContains(t, cleanLog, "gw_sk_9999888877776666")
	assert.NotContains(t, cleanLog, "sk-proj-1122334455667788")
	assert.Contains(t, cleanLog, "[REDACTED_TOKEN]")
}
