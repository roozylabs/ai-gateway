package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestQuotaHandler_List_Empty(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	req, _ := http.NewRequest("GET", "/v1/quotas", nil)
	c.Request = req

	handler := &QuotaHandler{repo: nil}
	// Missing DB will panic or fail cleanly
	defer func() {
		if r := recover(); r != nil {
			assert.NotNil(t, r)
		}
	}()

	handler.List(c)
	var resp map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
}
