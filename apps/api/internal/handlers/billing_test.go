package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestBillingHandler_ListPlans(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	req, _ := http.NewRequest("GET", "/v1/billing/plans", nil)
	c.Request = req

	handler := NewBillingHandler(nil)
	handler.ListPlans(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "list", resp["object"])
	plans, ok := resp["data"].([]interface{})
	assert.True(t, ok)
	assert.Equal(t, 4, len(plans))
}
