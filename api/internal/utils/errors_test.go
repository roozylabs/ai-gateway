package utils

import (
	"errors"
	"net/http"
	"testing"
)

func TestCleanUpstreamError(t *testing.T) {
	tests := []struct {
		name                 string
		inputErr             error
		expectedStatus       int
		expectedType         string
		expectedCode         string
		expectedMsgSubstring string
	}{
		{
			name:                 "Google FreeUsageLimitError",
			inputErr:             errors.New(`all credentials exhausted after 4 retries: upstream rate limit (429) on credential 423cdb95-0891-4fc0-b1c9-37eae5d89c8e: {"type":"error","error":{"type":"FreeUsageLimitError","message":"Rate limit exceeded."}}`),
			expectedStatus:       http.StatusTooManyRequests,
			expectedType:         "rate_limit_error",
			expectedCode:         "quota_exceeded",
			expectedMsgSubstring: "daily free usage limit",
		},
		{
			name:                 "Generic 429 Rate Limit",
			inputErr:             errors.New(`all credentials for provider are currently in cooldown due to upstream rate limits`),
			expectedStatus:       http.StatusTooManyRequests,
			expectedType:         "rate_limit_error",
			expectedCode:         "rate_limit_exceeded",
			expectedMsgSubstring: "temporarily reached their usage limit",
		},
		{
			name:                 "Model Not Found",
			inputErr:             errors.New(`model not found`),
			expectedStatus:       http.StatusNotFound,
			expectedType:         "invalid_request_error",
			expectedCode:         "model_not_found",
			expectedMsgSubstring: "unavailable or has been disabled",
		},
		{
			name:                 "No Credentials Available",
			inputErr:             errors.New(`no credentials available`),
			expectedStatus:       http.StatusServiceUnavailable,
			expectedType:         "api_error",
			expectedCode:         "no_credentials_available",
			expectedMsgSubstring: "No active API keys",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, errType, errCode, msg := CleanUpstreamError(tt.inputErr)
			if status != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, status)
			}
			if errType != tt.expectedType {
				t.Errorf("expected type %s, got %s", tt.expectedType, errType)
			}
			if errCode != tt.expectedCode {
				t.Errorf("expected code %s, got %s", tt.expectedCode, errCode)
			}
			if msg == "" {
				t.Errorf("expected non-empty user-friendly message")
			}
		})
	}
}
