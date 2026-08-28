package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMaskAPIKey(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"long key", "sk-ant-abc123xyz456", "sk-ant-a••••z456"},
		{"very long key", "sk-proj-xyz789abc012def345", "sk-proj-••••f345"},
		{"short key", "sk-12345678", "sk-1••••5678"},
		{"very short key", "abcdef", "••••"},
		{"exactly 12 chars", "abcdefghijkl", "abcd••••"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := MaskAPIKey(tt.input)
			if result != tt.expected {
				t.Errorf("MaskAPIKey(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestRedactSensitive(t *testing.T) {
	errMessage := "Failed request with Bearer gw_sk_1234567890abcdef12345678 and key sk-proj-abcdef1234567890"
	redacted := RedactSensitive(errMessage)

	assert.NotContains(t, redacted, "gw_sk_1234567890abcdef12345678")
	assert.NotContains(t, redacted, "sk-proj-abcdef1234567890")
	assert.Contains(t, redacted, "Bearer [REDACTED_TOKEN]")
}
