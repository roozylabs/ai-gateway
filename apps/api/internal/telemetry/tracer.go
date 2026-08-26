package telemetry

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

const TracerName = "prism-gateway-tracer"

// GetTracer returns global Prism OpenTelemetry tracer.
func GetTracer() trace.Tracer {
	return otel.GetTracerProvider().Tracer(TracerName)
}

// StartSpan creates a child span with Prism default attributes.
func StartSpan(ctx context.Context, spanName string, opts ...trace.SpanStartOption) (context.Context, trace.Span) {
	return GetTracer().Start(ctx, spanName, opts...)
}

// SetSpanAttributes attaches standard Prism attributes to a span.
func SetSpanAttributes(span trace.Span, attrs map[string]interface{}) {
	if !span.IsRecording() || attrs == nil {
		return
	}
	var otelAttrs []attribute.KeyValue
	for k, v := range attrs {
		switch val := v.(type) {
		case string:
			if val != "" {
				otelAttrs = append(otelAttrs, attribute.String(k, val))
			}
		case int:
			otelAttrs = append(otelAttrs, attribute.Int(k, val))
		case int64:
			otelAttrs = append(otelAttrs, attribute.Int64(k, val))
		case float64:
			otelAttrs = append(otelAttrs, attribute.Float64(k, val))
		case bool:
			otelAttrs = append(otelAttrs, attribute.Bool(k, val))
		}
	}
	span.SetAttributes(otelAttrs...)
}

// TraceIDFromContext extracts trace ID string from context.
func TraceIDFromContext(ctx context.Context) string {
	span := trace.SpanFromContext(ctx)
	if span != nil && span.SpanContext().IsValid() {
		return span.SpanContext().TraceID().String()
	}
	return ""
}

