package proxy

import (
	"context"

	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/telemetry"
)

// CalculateCredentialHealthScore computes a dynamic score (0.00 to 100.00) based on
// total requests, cumulative error count, active cooldown state, and remaining quota.
func CalculateCredentialHealthScore(requestCount, errorCount int64, isCoolingDown bool, remainingQuota int64, hasQuotaLimit bool) float64 {
	score := 100.0

	// 1. Success Rate Component (60 points weight)
	if requestCount > 0 {
		successRate := float64(requestCount-errorCount) / float64(requestCount)
		if successRate < 0 {
			successRate = 0
		}
		// 60 points max from success rate
		score -= (1.0 - successRate) * 60.0
	}

	// 2. Cooldown / Rate Limit Penalty (30 points weight)
	if isCoolingDown {
		score -= 30.0
	}

	// 3. Quota Exhaustion Penalty (10 points weight)
	if hasQuotaLimit && remainingQuota <= 0 {
		score -= 10.0
	}

	// Clamp score strictly to [0.0, 100.0]
	if score < 0.0 {
		score = 0.0
	}
	if score > 100.0 {
		score = 100.0
	}

	return score
}

// DetermineCredentialStatus maps credential properties, cooldown state, and health score
// to state machine status: HEALTHY, DEGRADED, COOLDOWN, EXHAUSTED, or DISABLED.
func DetermineCredentialStatus(enabled bool, isCoolingDown bool, isExhausted bool, score float64) string {
	if !enabled {
		return models.CredentialStatusDisabled
	}
	if isExhausted {
		return models.CredentialStatusExhausted
	}
	if isCoolingDown {
		return models.CredentialStatusCooldown
	}
	if score < 80.0 {
		return models.CredentialStatusDegraded
	}
	return models.CredentialStatusHealthy
}

// RecordCredentialHealthTelemetry updates OpenTelemetry health score metric gauge.
func RecordCredentialHealthTelemetry(ctx context.Context, credentialID, providerID string, score float64) {
	telemetry.RecordCredentialHealth(ctx, credentialID, providerID, score)
}
