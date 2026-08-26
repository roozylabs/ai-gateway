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

func TestCreateAgentTemplateRequest_Validation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Missing required fields (Name, Slug, Role)
	body := strings.NewReader(`{"description": "Test template"}`)
	req, _ := http.NewRequest("POST", "/v1/agent-templates", body)
	req.Header.Set("Content-Type", "application/json")
	c.Request = req

	handler := &AgentTemplateHandler{tmplRepo: nil, agentRepo: nil}
	handler.CreateTemplate(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp, "error")
}
