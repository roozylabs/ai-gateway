package proxy

import (
	"context"
	"os"
	"strconv"
	"sync"
)

// ProviderConcurrencyLimiter bounds maximum concurrent active streams per provider type
// using zero-overhead, context-aware Go buffered channel semaphores.
type ProviderConcurrencyLimiter struct {
	mu     sync.Mutex
	sems   map[string]chan struct{}
	limits map[string]int
}

// NewProviderConcurrencyLimiter creates a limiter with default limits.
func NewProviderConcurrencyLimiter() *ProviderConcurrencyLimiter {
	opencodeLimit := 2
	if envVal := os.Getenv("OPENCODE_MAX_CONCURRENCY"); envVal != "" {
		if n, err := strconv.Atoi(envVal); err == nil && n > 0 {
			opencodeLimit = n
		}
	}

	limiter := &ProviderConcurrencyLimiter{
		sems:   make(map[string]chan struct{}),
		limits: make(map[string]int),
	}

	limiter.limits["opencode"] = opencodeLimit
	limiter.sems["opencode"] = make(chan struct{}, opencodeLimit)

	return limiter
}

// SetLimit dynamically updates or sets max concurrency limit for a provider type.
func (l *ProviderConcurrencyLimiter) SetLimit(providerType string, limit int) {
	if limit <= 0 {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	l.limits[providerType] = limit
	l.sems[providerType] = make(chan struct{}, limit)
}

// Acquire blocks until a slot is available for the provider type or ctx is cancelled.
// Returns a release callback function that must be called when request execution completes.
func (l *ProviderConcurrencyLimiter) Acquire(ctx context.Context, providerType string) (func(), error) {
	l.mu.Lock()
	sem, exists := l.sems[providerType]
	if !exists {
		limit, hasLimit := l.limits[providerType]
		if !hasLimit || limit <= 0 {
			l.mu.Unlock()
			return func() {}, nil
		}
		sem = make(chan struct{}, limit)
		l.sems[providerType] = sem
	}
	l.mu.Unlock()

	select {
	case sem <- struct{}{}:
		var once sync.Once
		release := func() {
			once.Do(func() {
				<-sem
			})
		}
		return release, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}
