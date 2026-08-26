package telemetry

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

const MeterName = "prism-gateway-meter"

var (
	meter metric.Meter

	requestCounter          metric.Int64Counter
	requestDurationHist     metric.Float64Histogram
	ttftDurationHist        metric.Float64Histogram
	tokenCounter            metric.Int64Counter
	costCounter             metric.Float64Counter
	activeRequestsCounter   metric.Int64UpDownCounter
	provider429Counter      metric.Int64Counter
	credentialHealthGauge   metric.Float64Gauge
)

func init() {
	meter = otel.GetMeterProvider().Meter(MeterName)

	var err error
	requestCounter, err = meter.Int64Counter("prism_requests_total",
		metric.WithDescription("Total number of requests handled by Prism Gateway"),
	)
	if err != nil {
		println("[OTel Meter Error] requestCounter:", err.Error())
	}

	requestDurationHist, err = meter.Float64Histogram("prism_request_duration_seconds",
		metric.WithDescription("Request latency duration in seconds"),
		metric.WithUnit("s"),
	)
	if err != nil {
		println("[OTel Meter Error] requestDurationHist:", err.Error())
	}

	ttftDurationHist, err = meter.Float64Histogram("prism_ttft_seconds",
		metric.WithDescription("Time To First Token duration in seconds"),
		metric.WithUnit("s"),
	)
	if err != nil {
		println("[OTel Meter Error] ttftDurationHist:", err.Error())
	}

	tokenCounter, err = meter.Int64Counter("prism_token_usage_total",
		metric.WithDescription("Total tokens processed (prompt & completion)"),
	)
	if err != nil {
		println("[OTel Meter Error] tokenCounter:", err.Error())
	}

	costCounter, err = meter.Float64Counter("prism_cost_usd_total",
		metric.WithDescription("Total estimated expenditure in USD"),
		metric.WithUnit("USD"),
	)
	if err != nil {
		println("[OTel Meter Error] costCounter:", err.Error())
	}

	activeRequestsCounter, err = meter.Int64UpDownCounter("prism_active_requests",
		metric.WithDescription("Current active requests undergoing proxy routing"),
	)
	if err != nil {
		println("[OTel Meter Error] activeRequestsCounter:", err.Error())
	}

	provider429Counter, err = meter.Int64Counter("prism_provider_error_429_total",
		metric.WithDescription("Total HTTP 429 Rate Limit encounters per provider"),
	)
	if err != nil {
		println("[OTel Meter Error] provider429Counter:", err.Error())
	}

	credentialHealthGauge, err = meter.Float64Gauge("prism_credential_health_score",
		metric.WithDescription("Credential health score (0-100)"),
	)
	if err != nil {
		println("[OTel Meter Error] credentialHealthGauge:", err.Error())
	}
}

// RecordRequestMetrics records completed request metrics.
func RecordRequestMetrics(ctx context.Context, model, provider, status, agentID string, latencySec float64, inputTokens, outputTokens int, costUSD float64) {
	attrs := metric.WithAttributes(
		attribute.String("model", model),
		attribute.String("provider", provider),
		attribute.String("status", status),
		attribute.String("agent_id", agentID),
	)

	if requestCounter != nil {
		requestCounter.Add(ctx, 1, attrs)
	}
	if requestDurationHist != nil {
		requestDurationHist.Record(ctx, latencySec, attrs)
	}

	if tokenCounter != nil && (inputTokens > 0 || outputTokens > 0) {
		tokenCounter.Add(ctx, int64(inputTokens), metric.WithAttributes(
			attribute.String("type", "prompt"),
			attribute.String("model", model),
			attribute.String("provider", provider),
		))
		tokenCounter.Add(ctx, int64(outputTokens), metric.WithAttributes(
			attribute.String("type", "completion"),
			attribute.String("model", model),
			attribute.String("provider", provider),
		))
	}

	if costCounter != nil && costUSD > 0 {
		costCounter.Add(ctx, costUSD, attrs)
	}
}

// RecordTTFT records Time To First Token for streaming requests.
func RecordTTFT(ctx context.Context, model, provider string, ttftSec float64) {
	if ttftDurationHist != nil && ttftSec > 0 {
		ttftDurationHist.Record(ctx, ttftSec, metric.WithAttributes(
			attribute.String("model", model),
			attribute.String("provider", provider),
		))
	}
}

// IncActiveRequests increments or decrements active requests count.
func IncActiveRequests(ctx context.Context, delta int64) {
	if activeRequestsCounter != nil {
		activeRequestsCounter.Add(ctx, delta)
	}
}

// RecordProvider429 records provider rate limit encounters.
func RecordProvider429(ctx context.Context, provider, credentialID string) {
	if provider429Counter != nil {
		provider429Counter.Add(ctx, 1, metric.WithAttributes(
			attribute.String("provider", provider),
			attribute.String("credential_id", credentialID),
		))
	}
}

// RecordCredentialHealth records credential health score gauge.
func RecordCredentialHealth(ctx context.Context, credentialID, provider string, score float64) {
	if credentialHealthGauge != nil {
		credentialHealthGauge.Record(ctx, score, metric.WithAttributes(
			attribute.String("credential_id", credentialID),
			attribute.String("provider", provider),
		))
	}
}

