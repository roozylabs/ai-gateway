package telemetry

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/exporters/prometheus"
	"go.opentelemetry.io/otel/propagation"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

type OTelShutdownFunc func(ctx context.Context) error

// InitOTel initializes OpenTelemetry TracerProvider, MeterProvider, and W3C Propagator.
func InitOTel(ctx context.Context) (OTelShutdownFunc, error) {
	enabled := os.Getenv("OTEL_ENABLED")
	if enabled != "true" && enabled != "1" {
		fmt.Println("[OTel] OpenTelemetry exporter disabled (set OTEL_ENABLED=true to enable)")
		return func(ctx context.Context) error { return nil }, nil
	}

	serviceName := os.Getenv("OTEL_SERVICE_NAME")
	if serviceName == "" {
		serviceName = "prism-gateway"
	}

	otlpEndpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if otlpEndpoint == "" {
		otlpEndpoint = "http://localhost:4318"
	}

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceNameKey.String(serviceName),
			semconv.ServiceVersionKey.String("0.1.0"),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create otel resource: %w", err)
	}

	// 1. OTLP Trace Exporter
	traceExporter, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpointURL(otlpEndpoint+"/v1/traces"),
		otlptracehttp.WithInsecure(),
	)
	if err != nil {
		fmt.Printf("[OTel Warning] Failed to initialize OTLP trace exporter: %v. Using fallback.\n", err)
	}

	samplingRate := 1.0
	if rateStr := os.Getenv("OTEL_SAMPLING_RATE"); rateStr != "" {
		if rate, err := strconv.ParseFloat(rateStr, 64); err == nil {
			samplingRate = rate
		}
	}

	var traceOpts []sdktrace.TracerProviderOption
	traceOpts = append(traceOpts, sdktrace.WithResource(res), sdktrace.WithSampler(sdktrace.TraceIDRatioBased(samplingRate)))
	if traceExporter != nil {
		traceOpts = append(traceOpts, sdktrace.WithBatcher(traceExporter, sdktrace.WithBatchTimeout(2*time.Second)))
	}

	tp := sdktrace.NewTracerProvider(traceOpts...)
	otel.SetTracerProvider(tp)

	// 2. Setup W3C Propagator
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	// 3. Prometheus Metric Exporter
	promExporter, err := prometheus.New()
	if err != nil {
		fmt.Printf("[OTel Warning] Failed to initialize Prometheus exporter: %v\n", err)
	}

	// 4. OTLP Metric Exporter
	var metricOpts []sdkmetric.Option
	metricOpts = append(metricOpts, sdkmetric.WithResource(res))
	if promExporter != nil {
		metricOpts = append(metricOpts, sdkmetric.WithReader(promExporter))
	}

	otlpMetricExporter, err := otlpmetrichttp.New(ctx,
		otlpmetrichttp.WithEndpointURL(otlpEndpoint+"/v1/metrics"),
		otlpmetrichttp.WithInsecure(),
	)
	if err == nil && otlpMetricExporter != nil {
		metricOpts = append(metricOpts, sdkmetric.WithReader(sdkmetric.NewPeriodicReader(otlpMetricExporter, sdkmetric.WithInterval(5*time.Second))))
	}

	mp := sdkmetric.NewMeterProvider(metricOpts...)
	otel.SetMeterProvider(mp)

	fmt.Printf("[OTel] OpenTelemetry initialized successfully (Service: %s, Endpoint: %s)\n", serviceName, otlpEndpoint)

	shutdown := func(shutdownCtx context.Context) error {
		fmt.Println("[OTel] Shutting down OpenTelemetry providers...")
		if err := tp.Shutdown(shutdownCtx); err != nil {
			fmt.Printf("[OTel Error] Error shutting down TracerProvider: %v\n", err)
		}
		if err := mp.Shutdown(shutdownCtx); err != nil {
			fmt.Printf("[OTel Error] Error shutting down MeterProvider: %v\n", err)
		}
		return nil
	}

	return shutdown, nil
}
