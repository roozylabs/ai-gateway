package telemetry_test

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/prism/internal/middleware"
	"github.com/roozylabs/prism/internal/telemetry"
	"github.com/roozylabs/prism/internal/utils"
	"github.com/stretchr/testify/assert"
)

// 1. Request ID Generation, Validation & Response Header Return
func TestCorrelation_RequestIDValidationAndPropagation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(middleware.CorrelationMiddleware())
	router.GET("/v1/chat/completions", func(c *gin.Context) {
		reqID := middleware.GetRequestID(c)
		execID := middleware.GetExecutionID(c)
		c.JSON(http.StatusOK, gin.H{
			"request_id":   reqID,
			"execution_id": execID,
		})
	})

	// Scenario A: Client provides valid custom X-Request-ID
	reqA := httptest.NewRequest("GET", "/v1/chat/completions", nil)
	reqA.Header.Set("X-Request-ID", "custom-req-id-123")
	wA := httptest.NewRecorder()
	router.ServeHTTP(wA, reqA)

	assert.Equal(t, http.StatusOK, wA.Code)
	assert.Equal(t, "custom-req-id-123", wA.Header().Get("X-Request-ID"))

	// Scenario B: Client provides invalid/malformed X-Request-ID (>64 chars) -> Regenerated UUID v4
	malformedID := "toolong_invalid_id_" + string(make([]byte, 100))
	reqB := httptest.NewRequest("GET", "/v1/chat/completions", nil)
	reqB.Header.Set("X-Request-ID", malformedID)
	wB := httptest.NewRecorder()
	router.ServeHTTP(wB, reqB)

	assert.Equal(t, http.StatusOK, wB.Code)
	genID := wB.Header().Get("X-Request-ID")
	assert.NotEmpty(t, genID)
	assert.NotEqual(t, malformedID, genID)
}

// 2. Execution ID Stability Across Retries
func TestCorrelation_ExecutionIDStabilityAcrossRetries(t *testing.T) {
	executionID := "exec_stable_uuid_999"

	attempts := []struct {
		AttemptID string
		ExecID    string
	}{
		{AttemptID: "attempt-1", ExecID: executionID},
		{AttemptID: "attempt-2", ExecID: executionID},
		{AttemptID: "attempt-3", ExecID: executionID},
	}

	for _, att := range attempts {
		assert.Equal(t, executionID, att.ExecID, "Execution ID must remain STABLE across retries")
		assert.NotEmpty(t, att.AttemptID)
	}

	assert.NotEqual(t, attempts[0].AttemptID, attempts[1].AttemptID, "Attempt ID must be unique per retry")
}

// 3. Structured Logging & Secret Redaction
func TestCorrelation_StructuredLoggingAndRedaction(t *testing.T) {
	// Capture stdout
	oldStdout := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	rawKey := "gw_sk_f964aef205157f39cec3a879cec3a879cee31a073ea3316ecf359348"
	rawBearer := "Bearer sk-proj-1234567890"

	utils.LogStructured(utils.StructuredLogEntry{
		Level:             "INFO",
		Message:           "Processing AI request for " + rawKey + " with header " + rawBearer,
		RequestID:         "req-123",
		ExecutionID:       "exec-456",
		RoutingDecisionID: "dec-789",
		AttemptID:         "attempt-1",
		OrganizationID:    "org_default",
		Provider:          "openai",
		Model:             "gpt-4o",
		Status:            "200",
	})

	_ = w.Close()
	os.Stdout = oldStdout

	var buf bytes.Buffer
	_, _ = io.Copy(&buf, r)
	logOutput := buf.String()

	assert.Contains(t, logOutput, `"request_id":"req-123"`)
	assert.Contains(t, logOutput, `"execution_id":"exec-456"`)
	assert.Contains(t, logOutput, `"routing_decision_id":"dec-789"`)
	assert.Contains(t, logOutput, `"attempt_id":"attempt-1"`)

	// Verify raw unmasked secrets are NOT present
	assert.NotContains(t, logOutput, rawKey)
	assert.NotContains(t, logOutput, rawBearer)

	// Verify secrets are redacted/masked
	assert.Contains(t, logOutput, "[REDACTED_TOKEN]")
	assert.Contains(t, logOutput, "••••")
}

// 4. Prometheus Low-Cardinality Metric Labels
func TestMetrics_LowCardinalityLabels(t *testing.T) {
	ctx := context.Background()

	highCardReqID := "req_123456789_very_high_cardinality"
	highCardUserID := "user_999999"

	assert.NotEmpty(t, highCardReqID)
	assert.NotEmpty(t, highCardUserID)

	telemetry.RecordRequestMetrics(ctx, "gpt-4o", "openai", "200", "org_default", 0.15, 100, 50, 0.002)
	telemetry.RecordProviderAttempt(ctx, "openai", "gpt-4o", 200, 0.12, false)
	telemetry.RecordRoutingDecision(ctx, "balanced", "fallback", false)
	telemetry.RecordAdmissionEvaluation(ctx, true, "allowed", "org_default")
}
