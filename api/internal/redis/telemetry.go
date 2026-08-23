package redis

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

type ModelMetrics struct {
	ModelSlug    string  `json:"modelSlug"`
	AvgTTFTMs    float64 `json:"avgTtftMs"`
	AvgLatencyMs float64 `json:"avgLatencyMs"`
	SampleCount  int64   `json:"sampleCount"`
	LastUpdated  int64   `json:"lastUpdated"`
}

type ModelTelemetryStore struct {
	rdb *goredis.Client
}

func NewModelTelemetryStore(rdb *goredis.Client) *ModelTelemetryStore {
	return &ModelTelemetryStore{rdb: rdb}
}

const (
	TelemetryTTLSec  = 900 // 15 minutes rolling window
	MaxSamplesPerKey = 50  // Last 50 requests per model
)

type LatencySample struct {
	TTFTMs    int   `json:"ttftMs"`
	LatencyMs int   `json:"latencyMs"`
	Timestamp int64 `json:"ts"`
}

func (s *ModelTelemetryStore) RecordModelLatency(ctx context.Context, modelSlug string, ttftMs int, latencyMs int) error {
	if s == nil || s.rdb == nil || modelSlug == "" {
		return nil
	}

	sample := LatencySample{
		TTFTMs:    ttftMs,
		LatencyMs: latencyMs,
		Timestamp: time.Now().Unix(),
	}

	raw, err := json.Marshal(sample)
	if err != nil {
		return err
	}

	key := fmt.Sprintf("telemetry:model:%s:samples", modelSlug)
	pipe := s.rdb.Pipeline()
	pipe.LPush(ctx, key, string(raw))
	pipe.LTrim(ctx, key, 0, MaxSamplesPerKey-1)
	pipe.Expire(ctx, key, time.Duration(TelemetryTTLSec)*time.Second)
	_, err = pipe.Exec(ctx)
	return err
}

func (s *ModelTelemetryStore) GetModelMetrics(ctx context.Context, modelSlug string) (*ModelMetrics, error) {
	if s == nil || s.rdb == nil || modelSlug == "" {
		return &ModelMetrics{ModelSlug: modelSlug}, nil
	}

	key := fmt.Sprintf("telemetry:model:%s:samples", modelSlug)
	items, err := s.rdb.LRange(ctx, key, 0, -1).Result()
	if err != nil && !errors.Is(err, goredis.Nil) {
		return nil, err
	}

	if len(items) == 0 {
		return &ModelMetrics{ModelSlug: modelSlug}, nil
	}

	var totalTTFT float64
	var totalLatency float64
	var count int64
	var lastTs int64

	for _, item := range items {
		var sample LatencySample
		if err := json.Unmarshal([]byte(item), &sample); err != nil {
			continue
		}
		if sample.TTFTMs > 0 {
			totalTTFT += float64(sample.TTFTMs)
		}
		if sample.LatencyMs > 0 {
			totalLatency += float64(sample.LatencyMs)
		}
		if sample.Timestamp > lastTs {
			lastTs = sample.Timestamp
		}
		count++
	}

	if count == 0 {
		return &ModelMetrics{ModelSlug: modelSlug}, nil
	}

	return &ModelMetrics{
		ModelSlug:    modelSlug,
		AvgTTFTMs:    totalTTFT / float64(count),
		AvgLatencyMs: totalLatency / float64(count),
		SampleCount:  count,
		LastUpdated:  lastTs,
	}, nil
}

func (s *ModelTelemetryStore) GetMultipleModelMetrics(ctx context.Context, modelSlugs []string) (map[string]*ModelMetrics, error) {
	result := make(map[string]*ModelMetrics)
	if s == nil || s.rdb == nil || len(modelSlugs) == 0 {
		return result, nil
	}

	for _, slug := range modelSlugs {
		metrics, err := s.GetModelMetrics(ctx, slug)
		if err == nil && metrics != nil {
			result[slug] = metrics
		}
	}

	return result, nil
}
