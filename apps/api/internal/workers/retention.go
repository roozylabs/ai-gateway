package workers

import (
	"context"
	"log"
	"time"

	"github.com/roozylabs/prism/internal/redis"
	"github.com/roozylabs/prism/internal/repository"
)

type LatencyFlushWorker struct {
	telemetry *redis.ModelTelemetryStore
	models    *repository.ModelRepository
	latency   *repository.ModelLatencyHourlyRepository
}

func NewLatencyFlushWorker(telemetry *redis.ModelTelemetryStore, models *repository.ModelRepository, latency *repository.ModelLatencyHourlyRepository) *LatencyFlushWorker {
	return &LatencyFlushWorker{telemetry: telemetry, models: models, latency: latency}
}

func (w *LatencyFlushWorker) Run(ctx context.Context) {
	modelList, err := w.models.ListEnabled(ctx)
	if err != nil {
		log.Printf("[latency-flush] list models: %v", err)
		return
	}
	hourStart := time.Now().Truncate(time.Hour)
	for _, m := range modelList {
		if !m.Enabled {
			continue
		}
		metrics, err := w.telemetry.GetModelMetrics(ctx, m.Slug)
		if err != nil || metrics.SampleCount == 0 {
			continue
		}
		avgTTFT := metrics.AvgTTFTMs
		avgLat := metrics.AvgLatencyMs
		p95 := metrics.P95TTFTMs
		samples := int(metrics.SampleCount)
		successes := int(metrics.SuccessCount)
		entry := &repository.ModelLatencyHourly{
			ModelSlug:    m.Slug,
			HourStart:    hourStart,
			AvgTTFTMs:    &avgTTFT,
			AvgLatencyMs: &avgLat,
			P95LatencyMs: &p95,
			SampleCount:  &samples,
			SuccessCount: &successes,
		}
		if err := w.latency.Upsert(ctx, entry); err != nil {
			log.Printf("[latency-flush] upsert %s: %v", m.Slug, err)
		}
	}
}

type PayloadRetentionWorker struct {
	payloads  *repository.PayloadRepository
	toolCalls *repository.ToolInvocationRepository
}

func NewPayloadRetentionWorker(payloads *repository.PayloadRepository, toolCalls *repository.ToolInvocationRepository) *PayloadRetentionWorker {
	return &PayloadRetentionWorker{payloads: payloads, toolCalls: toolCalls}
}

func (w *PayloadRetentionWorker) Run(ctx context.Context) {
	cutoff := time.Now().Add(-30 * 24 * time.Hour)
	if w.payloads != nil {
		n, err := w.payloads.DeleteOlderThan(ctx, cutoff)
		if err != nil {
			log.Printf("[retention] payloads cleanup: %v", err)
		} else if n > 0 {
			log.Printf("[retention] cleaned %d old payloads", n)
		}
	}
	if w.toolCalls != nil {
		n, err := w.toolCalls.DeleteOlderThan(ctx, cutoff)
		if err != nil {
			log.Printf("[retention] tool_calls cleanup: %v", err)
		} else if n > 0 {
			log.Printf("[retention] cleaned %d old tool invocations", n)
		}
	}
}
