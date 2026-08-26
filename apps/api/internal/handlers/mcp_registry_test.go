package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRegisterMCPCatalogRequest_Validation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Missing required fields (Name, Slug, ServerURL)
	body := strings.NewReader(`{"description": "Test server"}`)
	req, _ := http.NewRequest("POST", "/v1/mcp/registry", body)
	req.Header.Set("Content-Type", "application/json")
	c.Request = req

	handler := &MCPRegistryHandler{repo: nil}
	handler.RegisterServer(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp, "error")
}
