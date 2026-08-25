package proxy

import (
	"context"
	"sync"
	"time"
)

// ProviderThrottler paces outgoing requests to rate-sensitive upstream providers
// (like OpenCode Zen on Cloudflare) to prevent instant concurrency burst blocks.
type ProviderThrottler struct {
	mu              sync.Mutex
	lastReq         map[string]time.Time
	intervals       map[string]time.Duration
	defaultInterval time.Duration
}

// NewProviderThrottler creates a throttler with sensible defaults per provider.
func NewProviderThrottler() *ProviderThrottler {
	return &ProviderThrottler{
		lastReq: make(map[string]time.Time),
		intervals: map[string]time.Duration{
			"opencode": 350 * time.Millisecond,
		},
		defaultInterval: 0,
	}
}

// SetInterval sets custom minimum spacing between requests for a provider type.
func (t *ProviderThrottler) SetInterval(providerType string, interval time.Duration) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.intervals[providerType] = interval
}

// Wait blocks until the minimum inter-request interval has passed for the given provider.
func (t *ProviderThrottler) Wait(ctx context.Context, providerType string) error {
	t.mu.Lock()
	interval, exists := t.intervals[providerType]
	if !exists {
		interval = t.defaultInterval
	}

	if interval <= 0 {
		t.mu.Unlock()
		return nil
	}

	last, ok := t.lastReq[providerType]
	now := time.Now()
	var waitDuration time.Duration

	if ok {
		elapsed := now.Sub(last)
		if elapsed < interval {
			waitDuration = interval - elapsed
		}
	}

	// Reserve the next execution time slot
	t.lastReq[providerType] = now.Add(waitDuration)
	t.mu.Unlock()

	if waitDuration > 0 {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(waitDuration):
		}
	}
	return nil
}
