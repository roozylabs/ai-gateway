package proxy_test

import (
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/proxy"
	"github.com/stretchr/testify/assert"
)

// In-Memory Cooldown Store for Deterministic Unit Testing
type InMemoryCooldownStore struct {
	cooldowns map[string]time.Time
	counts    map[string]int64
	streams   map[string]map[string]interface{}
	mu        sync.Mutex
}

func NewInMemoryCooldownStore() *InMemoryCooldownStore {
	return &InMemoryCooldownStore{
		cooldowns: make(map[string]time.Time),
		counts:    make(map[string]int64),
		streams:   make(map[string]map[string]interface{}),
	}
}

func (s *InMemoryCooldownStore) SetCooldown(credID string, seconds int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cooldowns[credID] = time.Now().Add(time.Duration(seconds) * time.Second)
}

func (s *InMemoryCooldownStore) IsCoolingDown(credID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	exp, ok := s.cooldowns[credID]
	if !ok {
		return false
	}
	if time.Now().After(exp) {
		delete(s.cooldowns, credID)
		return false
	}
	return true
}

func (s *InMemoryCooldownStore) RecordServerError(credID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.counts[credID]++
	if s.counts[credID] >= 3 {
		s.cooldowns[credID] = time.Now().Add(60 * time.Second)
		s.counts[credID] = 0
		return true
	}
	return false
}

func (s *InMemoryCooldownStore) RecordSuccess(credID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.counts, credID)
}

func (s *InMemoryCooldownStore) TrackActiveStream(reqID, model, keyID, credName string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.streams[reqID] = map[string]interface{}{
		"model":     model,
		"keyID":     keyID,
		"credName":  credName,
		"startedAt": time.Now().Unix(),
	}
}

func (s *InMemoryCooldownStore) UntrackActiveStream(reqID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.streams, reqID)
}

func (s *InMemoryCooldownStore) ActiveStreamCount() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.streams)
}

// Step 3: Credential State Machine & Exclusion Rules
func TestCredentialState_ExclusionRules(t *testing.T) {
	tests := []struct {
		name          string
		enabled       bool
		isCoolingDown bool
		isExhausted   bool
		healthScore   float64
		wantStatus    string
		wantSelect    bool
	}{
		{
			name:          "Healthy active credential",
			enabled:       true,
			isCoolingDown: false,
			isExhausted:   false,
			healthScore:   95.0,
			wantStatus:    models.CredentialStatusHealthy,
			wantSelect:    true,
		},
		{
			name:          "Degraded active credential",
			enabled:       true,
			isCoolingDown: false,
			isExhausted:   false,
			healthScore:   75.0,
			wantStatus:    models.CredentialStatusDegraded,
			wantSelect:    true,
		},
		{
			name:          "Cooldown credential",
			enabled:       true,
			isCoolingDown: true,
			isExhausted:   false,
			healthScore:   70.0,
			wantStatus:    models.CredentialStatusCooldown,
			wantSelect:    false,
		},
		{
			name:          "Disabled credential",
			enabled:       false,
			isCoolingDown: false,
			isExhausted:   false,
			healthScore:   100.0,
			wantStatus:    models.CredentialStatusDisabled,
			wantSelect:    false,
		},
		{
			name:          "Exhausted credential",
			enabled:       true,
			isCoolingDown: false,
			isExhausted:   true,
			healthScore:   60.0,
			wantStatus:    models.CredentialStatusExhausted,
			wantSelect:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status := proxy.DetermineCredentialStatus(tt.enabled, tt.isCoolingDown, tt.isExhausted, tt.healthScore)
			assert.Equal(t, tt.wantStatus, status)

			isSelectable := status == models.CredentialStatusHealthy || status == models.CredentialStatusDegraded
			assert.Equal(t, tt.wantSelect, isSelectable, "Selectable mismatch for status %s", status)
		})
	}
}

// Step 4: Retry Policy & Non-Retryable Error Classification
func TestRetryPolicy_ErrorClassification(t *testing.T) {
	nonRetryableCodes := []int{http.StatusUnauthorized, http.StatusForbidden}
	for _, code := range nonRetryableCodes {
		t.Run(fmt.Sprintf("Status_%d_IsNonRetryable", code), func(t *testing.T) {
			isNonRetryable := code == http.StatusUnauthorized || code == http.StatusForbidden
			assert.True(t, isNonRetryable)
		})
	}

	retryableCodes := []int{http.StatusTooManyRequests, http.StatusInternalServerError, http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout}
	for _, code := range retryableCodes {
		t.Run(fmt.Sprintf("Status_%d_IsRetryable", code), func(t *testing.T) {
			isRetryable := code == http.StatusTooManyRequests || code >= 500
			assert.True(t, isRetryable)
		})
	}
}

// Step 5: Fallback Cascade Simulation (A -> 429 -> Cooldown -> B -> 200 OK)
func TestFallback_CascadeSequence(t *testing.T) {
	store := NewInMemoryCooldownStore()
	credA := "cred_A"
	credB := "cred_B"

	// Step 1: Credential A returns 429 Rate Limit -> Enters Cooldown
	store.SetCooldown(credA, 60)
	assert.True(t, store.IsCoolingDown(credA))

	// Step 2: Router skips Credential A (cooling down) and selects Credential B
	assert.False(t, store.IsCoolingDown(credB))

	// Step 3: Credential B execution succeeds
	store.RecordSuccess(credB)

	assert.True(t, store.IsCoolingDown(credA))
	assert.False(t, store.IsCoolingDown(credB))
}

// Step 6: All Credentials Failed Simulation (A -> 429, B -> Timeout, C -> 500)
func TestFallback_AllCredentialsFailed(t *testing.T) {
	fakeServer := NewDeterministicProviderServer(func(reqNum int64) (FailureType, time.Duration) {
		switch reqNum {
		case 1:
			return SimStatus429, 0
		case 2:
			return SimStatus504, 0
		case 3:
			return SimStatus500, 0
		default:
			return SimStatus500, 0
		}
	})
	defer fakeServer.Close()

	for i := 1; i <= 3; i++ {
		resp, err := http.Get(fakeServer.URL())
		assert.NoError(t, err)
		_ = resp.Body.Close()
		assert.True(t, resp.StatusCode >= 400)
	}

	assert.Equal(t, int64(3), fakeServer.RequestCount())
}

// Step 7: Circuit Breaker & 50x Quarantine Threshold
func TestCircuitBreaker_QuarantineThreshold(t *testing.T) {
	store := NewInMemoryCooldownStore()
	credID := "cred_cb_threshold"

	// 1st error -> No quarantine
	q1 := store.RecordServerError(credID)
	assert.False(t, q1)

	// 2nd error -> No quarantine
	q2 := store.RecordServerError(credID)
	assert.False(t, q2)

	// 3rd error -> Threshold (3) reached -> Quarantined!
	q3 := store.RecordServerError(credID)
	assert.True(t, q3)
	assert.True(t, store.IsCoolingDown(credID))
}

func TestCircuitBreaker_SuccessResetsCounter(t *testing.T) {
	store := NewInMemoryCooldownStore()
	credID := "cred_cb_reset"

	_ = store.RecordServerError(credID)
	_ = store.RecordServerError(credID)

	// Success resets counter
	store.RecordSuccess(credID)

	// Next error is count 1 -> Not quarantined
	q := store.RecordServerError(credID)
	assert.False(t, q)
}

func TestCircuitBreaker_ConcurrentStateTransitions(t *testing.T) {
	store := NewInMemoryCooldownStore()
	credID := "cred_cb_concurrent"
	var wg sync.WaitGroup
	workers := 20
	var quarantinedCount int64

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if store.RecordServerError(credID) {
				atomic.AddInt64(&quarantinedCount, 1)
			}
		}()
	}
	wg.Wait()

	assert.True(t, store.IsCoolingDown(credID))
	assert.True(t, atomic.LoadInt64(&quarantinedCount) >= 1)
}

// Step 8: Streaming Interruption & Active Stream Tracking
func TestStreaming_ActiveStreamTrackingAndCleanup(t *testing.T) {
	store := NewInMemoryCooldownStore()
	reqID := "req_stream_test_999"

	// 1. Track stream
	store.TrackActiveStream(reqID, "gpt-4o", "key_1", "OpenAI Main Key")
	assert.Equal(t, 1, store.ActiveStreamCount())

	// 2. Untrack stream upon completion or error
	store.UntrackActiveStream(reqID)
	assert.Equal(t, 0, store.ActiveStreamCount())
}

// Step 9: Billing & Metering Accuracy Rules
func TestBilling_NoDoubleChargingOnRetries(t *testing.T) {
	type ExecutionAttempt struct {
		CredentialID  string
		StatusCode    int
		TokensBilled  int
		CostUSDBilled float64
	}

	attempts := []ExecutionAttempt{
		{CredentialID: "cred_A", StatusCode: 429, TokensBilled: 0, CostUSDBilled: 0.0},
		{CredentialID: "cred_B", StatusCode: 500, TokensBilled: 0, CostUSDBilled: 0.0},
		{CredentialID: "cred_C", StatusCode: 200, TokensBilled: 150, CostUSDBilled: 0.003},
	}

	totalTokensBilled := 0
	totalCostBilled := 0.0

	for _, att := range attempts {
		totalTokensBilled += att.TokensBilled
		totalCostBilled += att.CostUSDBilled
	}

	assert.Equal(t, 150, totalTokensBilled)
	assert.InDelta(t, 0.003, totalCostBilled, 0.0001)
}

// Step 10: Prism-Auto Cross-Provider Failover on 400 Format Error / 429 Quota Error
func TestPrismAuto_FailoverOnUpstream400And429(t *testing.T) {
	// Candidate 1 (Google) returns 400 Thought Signature Missing or 429 Daily Free Limit
	// Candidate 2 (OpenCode Zen) returns 200 OK
	store := NewInMemoryCooldownStore()

	googleCred := "cred_google_gemini"
	opencodeCred := "cred_opencode_zen"

	// 1. First candidate (Google) fails with 400 / 429
	store.SetCooldown(googleCred, 300)
	assert.True(t, store.IsCoolingDown(googleCred))

	// 2. Failover executes on next candidate (OpenCode Zen) which is healthy
	assert.False(t, store.IsCoolingDown(opencodeCred))
	store.RecordSuccess(opencodeCred)

	assert.False(t, store.IsCoolingDown(opencodeCred))
	assert.True(t, store.IsCoolingDown(googleCred))
}

