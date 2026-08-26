package proxy

import (
	"testing"

	"github.com/roozylabs/prism/internal/models"
)

func TestCalculateCredentialHealthScore(t *testing.T) {
	tests := []struct {
		name           string
		reqCount       int64
		errCount       int64
		isCoolingDown  bool
		remainingQuota int64
		hasQuotaLimit  bool
		wantMin        float64
		wantMax        float64
	}{
		{
			name:           "Perfect health - no traffic",
			reqCount:       0,
			errCount:       0,
			isCoolingDown:  false,
			remainingQuota: 1000,
			hasQuotaLimit:  true,
			wantMin:        100.0,
			wantMax:        100.0,
		},
		{
			name:           "High success rate - 90/100",
			reqCount:       100,
			errCount:       10,
			isCoolingDown:  false,
			remainingQuota: 500,
			hasQuotaLimit:  true,
			wantMin:        93.9,
			wantMax:        94.1, // 100 - (0.1 * 60) = 94.0
		},
		{
			name:           "Active Cooldown penalty",
			reqCount:       100,
			errCount:       0,
			isCoolingDown:  true,
			remainingQuota: 500,
			hasQuotaLimit:  true,
			wantMin:        69.9,
			wantMax:        70.1, // 100 - 30 = 70.0
		},
		{
			name:           "Quota exhausted",
			reqCount:       100,
			errCount:       0,
			isCoolingDown:  false,
			remainingQuota: 0,
			hasQuotaLimit:  true,
			wantMin:        89.9,
			wantMax:        90.1, // 100 - 10 = 90.0
		},
		{
			name:           "Severe failure + cooldown",
			reqCount:       10,
			errCount:       10,
			isCoolingDown:  true,
			remainingQuota: 0,
			hasQuotaLimit:  true,
			wantMin:        0.0,
			wantMax:        0.0, // 100 - 60 - 30 - 10 = 0.0
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculateCredentialHealthScore(tt.reqCount, tt.errCount, tt.isCoolingDown, tt.remainingQuota, tt.hasQuotaLimit)
			if got < tt.wantMin || got > tt.wantMax {
				t.Errorf("CalculateCredentialHealthScore() = %v, want range [%v, %v]", got, tt.wantMin, tt.wantMax)
			}
		})
	}
}

func TestDetermineCredentialStatus(t *testing.T) {
	tests := []struct {
		name          string
		enabled       bool
		isCoolingDown bool
		isExhausted   bool
		score         float64
		wantStatus    string
	}{
		{
			name:          "Disabled credential",
			enabled:       false,
			isCoolingDown: false,
			isExhausted:   false,
			score:         100.0,
			wantStatus:    models.CredentialStatusDisabled,
		},
		{
			name:          "Exhausted quota credential",
			enabled:       true,
			isCoolingDown: false,
			isExhausted:   true,
			score:         90.0,
			wantStatus:    models.CredentialStatusExhausted,
		},
		{
			name:          "Cooldown credential",
			enabled:       true,
			isCoolingDown: true,
			isExhausted:   false,
			score:         70.0,
			wantStatus:    models.CredentialStatusCooldown,
		},
		{
			name:          "Degraded score credential (< 80)",
			enabled:       true,
			isCoolingDown: false,
			isExhausted:   false,
			score:         75.0,
			wantStatus:    models.CredentialStatusDegraded,
		},
		{
			name:          "Healthy credential (>= 80)",
			enabled:       true,
			isCoolingDown: false,
			isExhausted:   false,
			score:         95.0,
			wantStatus:    models.CredentialStatusHealthy,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := DetermineCredentialStatus(tt.enabled, tt.isCoolingDown, tt.isExhausted, tt.score)
			if got != tt.wantStatus {
				t.Errorf("DetermineCredentialStatus() = %v, want %v", got, tt.wantStatus)
			}
		})
	}
}
