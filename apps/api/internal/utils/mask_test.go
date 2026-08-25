package utils

import "testing"

func TestMaskAPIKey(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"long key", "sk-ant-abc123xyz456", "sk-ant-a••••z456"},
		{"very long key", "sk-proj-xyz789abc012def345", "sk-proj-••••f345"},
		{"short key", "sk-12345678", "sk-1••••5678"},
		{"very short key", "abcdef", "abcd••••cdef"},
		{"exactly 12 chars", "abcdefghijkl", "abcd••••ijkl"},
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
