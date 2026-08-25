package proxy

import (
	"context"
	"sync"
	"time"

	"github.com/roozylabs/prism/internal/repository"
)

// DefaultProviderHealthScore is applied when a provider has no observed
// traffic in the aggregation window (benefit of the doubt).
const DefaultProviderHealthScore = 0.95

// ComputeHealthScore returns a 0..1 provider health score from observed traffic:
// 0.7*successRate + 0.3*(1 - min(avgLatencyMs/5000, 1)), clamped to [0, 1].
// samples <= 0 → DefaultProviderHealthScore regardless of other inputs.
func ComputeHealthScore(successRate, avgLatencyMs float64, samples int64) float64 {
	if samples <= 0 {
		return DefaultProviderHealthScore
	}
	latencyScore := 1.0 - min(avgLatencyMs/5000.0, 1.0)
	score := 0.7*successRate + 0.3*latencyScore
	return min(max(score, 0.0), 1.0)
}

// ProviderHealthStore caches composite per-provider health scores computed from
// request_logs, refreshed at most once per TTL.
type ProviderHealthStore struct {
	repo    *repository.RequestLogRepository
	ttl     time.Duration
	mu      sync.Mutex
	scores  map[string]float64
	fetched time.Time
	fetch   func(ctx context.Context) (map[string]float64, error)
}

func NewProviderHealthStore(repo *repository.RequestLogRepository, ttl time.Duration) *ProviderHealthStore {
	s := &ProviderHealthStore{repo: repo, ttl: ttl}
	s.fetch = s.fetchFromRepo
	return s
}

func (s *ProviderHealthStore) fetchFromRepo(ctx context.Context) (map[string]float64, error) {
	stats, err := s.repo.GetProviderHealthStats(ctx)
	if err != nil {
		return nil, err
	}
	scores := make(map[string]float64, len(stats))
	for _, st := range stats {
		scores[st.ProviderID] = ComputeHealthScore(st.SuccessRate, st.AvgLatencyMs, st.Samples)
	}
	return scores, nil
}

// Scores returns the cached provider→score map; refetches when stale.
// On repo error it returns the last known map (possibly empty), never panics.
// Providers without traffic are absent — callers treat missing keys as
// DefaultProviderHealthScore.
func (s *ProviderHealthStore) Scores(ctx context.Context) map[string]float64 {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.scores != nil && time.Since(s.fetched) < s.ttl {
		return s.scores
	}
	fetched, err := s.fetch(ctx)
	if err != nil || fetched == nil {
		return s.scores
	}
	s.scores = fetched
	s.fetched = time.Now()
	return s.scores
}
