package security

import (
	"net"
	"os"
	"testing"
	"time"
)

func TestIsPrivateIP(t *testing.T) {
	tests := []struct {
		ip       string
		expected bool
	}{
		{"127.0.0.1", true},
		{"10.0.0.1", true},
		{"10.255.255.255", true},
		{"172.16.0.1", true},
		{"172.31.255.255", true},
		{"192.168.1.1", true},
		{"169.254.169.254", true},
		{"0.0.0.0", true},
		{"::1", true},
		{"fc00::1", true},
		{"fe80::1", true},
		{"8.8.8.8", false},
		{"1.1.1.1", false},
		{"142.250.190.46", false}, // Google public IP
		{"104.244.42.1", false},
	}

	for _, tt := range tests {
		ip := net.ParseIP(tt.ip)
		if ip == nil {
			t.Fatalf("failed to parse IP %s", tt.ip)
		}
		got := IsPrivateIP(ip)
		if got != tt.expected {
			t.Errorf("IsPrivateIP(%s) = %v, expected %v", tt.ip, got, tt.expected)
		}
	}
}

func TestValidateOutboundURL_BlockedTargets(t *testing.T) {
	_ = os.Unsetenv("ALLOW_INTERNAL_SSRF")
	_ = os.Unsetenv("IS_DEVELOPMENT")

	blockedURLs := []string{
		"http://localhost:8080/api",
		"http://127.0.0.1:5432",
		"http://10.0.0.5/admin",
		"http://172.16.1.1/secret",
		"http://192.168.1.100:3000",
		"http://169.254.169.254/latest/meta-data/",
		"http://metadata.google.internal/computeMetadata/v1/",
		"http://database.local:5432",
		"ftp://example.com/file",
		"file:///etc/passwd",
		"gopher://example.com",
	}

	for _, rawURL := range blockedURLs {
		err := ValidateOutboundURL(rawURL)
		if err == nil {
			t.Errorf("expected ValidateOutboundURL(%q) to be blocked, but it was allowed", rawURL)
		}
	}
}

func TestNewSafeHTTPClient_Construction(t *testing.T) {
	client := NewSafeHTTPClient(5 * time.Second)
	if client == nil {
		t.Fatal("expected non-nil safe HTTP client")
	}
	if client.Timeout != 5*time.Second {
		t.Errorf("expected client timeout 5s, got %v", client.Timeout)
	}
	if client.Transport == nil {
		t.Fatal("expected non-nil transport")
	}
}
