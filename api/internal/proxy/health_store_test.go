package proxy

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestComputeHealthScore_NoSamples(t *testing.T) {
	cases := []struct {
		successRate  float64
		avgLatencyMs float64
	}{
		{0.0, 0.0},
		{1.0, 0.0},
		{0.42, 9000},
		{-1.0, -5000},
	}
	for _, tc := range cases {
		got := ComputeHealthScore(tc.successRate, tc.avgLatencyMs, 0)
		if got != 0.95 {
			t.Errorf("ComputeHealthScore(%v, %v, 0) = %v, want 0.95", tc.successRate, tc.avgLatencyMs, got)
		}
	}
}

func TestComputeHealthScore_Perfect(t *testing.T) {
	got := ComputeHealthScore(1.0, 0, 100)
	if got != 1.0 {
		t.Errorf("ComputeHealthScore(1.0, 0, 100) = %v, want 1.0", got)
	}
}

func TestComputeHealthScore_HalfErrorsLowLatency(t *testing.T) {
	got := ComputeHealthScore(0.5, 0, 10)
	want := 0.65
	const eps = 1e-9
	diff := got - want
	if diff < -eps || diff > eps {
		t.Errorf("ComputeHealthScore(0.5, 0, 10) = %v, want %v", got, want)
	}
}

func TestComputeHealthScore_LatencyCapped(t *testing.T) {
	got := ComputeHealthScore(1.0, 10000, 50)
	want := 0.70
	const eps = 1e-9
	diff := got - want
	if diff < -eps || diff > eps {
		t.Errorf("ComputeHealthScore(1.0, 10000, 50) = %v, want %v", got, want)
	}
}

func TestComputeHealthScore_ClampedToZeroOne(t *testing.T) {
	low := ComputeHealthScore(-1.0, 10000, 25)
	if low != 0.0 {
		t.Errorf("negative inputs produced %v, want clamped 0.0", low)
	}
	high := ComputeHealthScore(5.0, -60000, 25)
	if high != 1.0 {
		t.Errorf("overshoot inputs produced %v, want clamped 1.0", high)
	}
}

func newTestHealthStore(ttl time.Duration, fetch func(ctx context.Context) (map[string]float64, error)) *ProviderHealthStore {
	return &ProviderHealthStore{
		ttl:   ttl,
		fetch: fetch,
	}
}

func TestHealthStore_FreshCacheSkipsFetch(t *testing.T) {
	ctx := context.Background()
	fetches := 0
	s := newTestHealthStore(time.Minute, func(ctx context.Context) (map[string]float64, error) {
		fetches++
		return map[string]float64{"p1": 0.8}, nil
	})

	first := s.Scores(ctx)
	second := s.Scores(ctx)

	if fetches != 1 {
		t.Errorf("expected 1 fetch within TTL, got %d", fetches)
	}
	if first["p1"] != 0.8 || second["p1"] != 0.8 {
		t.Errorf("unexpected cached scores: %v / %v", first, second)
	}
}

func TestHealthStore_StaleCacheRefetches(t *testing.T) {
	ctx := context.Background()
	fetches := 0
	s := newTestHealthStore(0, func(ctx context.Context) (map[string]float64, error) {
		fetches++
		if fetches == 1 {
			return map[string]float64{"p1": 0.8}, nil
		}
		return map[string]float64{"p1": 0.2}, nil
	})

	first := s.Scores(ctx)["p1"]
	second := s.Scores(ctx)["p1"]

	if fetches != 2 {
		t.Errorf("expected refetch when stale, got %d fetches", fetches)
	}
	if first != 0.8 || second != 0.2 {
		t.Errorf("expected refreshed score, got %v then %v", first, second)
	}
}

func TestHealthStore_ErrorKeepsLastKnownScores(t *testing.T) {
	ctx := context.Background()
	call := 0
	s := newTestHealthStore(0, func(ctx context.Context) (map[string]float64, error) {
		call++
		if call == 1 {
			return map[string]float64{"p1": 0.9}, nil
		}
		return nil, errors.New("db down")
	})

	first := s.Scores(ctx)
	second := s.Scores(ctx)

	if first["p1"] != 0.9 || second["p1"] != 0.9 {
		t.Errorf("expected last known scores on error, got %v then %v", first, second)
	}
}

func TestHealthStore_ConcurrentScoresSafe(t *testing.T) {
	ctx := context.Background()
	s := newTestHealthStore(time.Millisecond, func(ctx context.Context) (map[string]float64, error) {
		return map[string]float64{"p1": 0.5}, nil
	})

	done := make(chan struct{})
	for i := 0; i < 16; i++ {
		go func() {
			defer func() { done <- struct{}{} }()
			for j := 0; j < 50; j++ {
				_ = s.Scores(ctx)
			}
		}()
	}
	for i := 0; i < 16; i++ {
		<-done
	}
}
