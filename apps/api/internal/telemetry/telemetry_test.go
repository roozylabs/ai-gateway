package telemetry

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestPrometheusHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, _ = InitOTel(context.Background())

	r := gin.New()
	r.GET("/metrics", PrometheusHandler())

	req, err := http.NewRequest("GET", "/metrics", nil)
	assert.NoError(t, err)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NotEmpty(t, w.Body.String())
}

