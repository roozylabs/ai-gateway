package workers

import (
	"context"
	"encoding/json"
	"log"
	"math"

	goredis "github.com/roozylabs/ai-gateway/internal/redis"
	"github.com/roozylabs/ai-gateway/internal/repository"
)

type AnomalyDetector struct {
	anomalies *repository.CostAnomalyRepository
	publisher *goredis.EventPublisher
}

func NewAnomalyDetector(anomalies *repository.CostAnomalyRepository, publisher *goredis.EventPublisher) *AnomalyDetector {
	return &AnomalyDetector{anomalies: anomalies, publisher: publisher}
}

func (d *AnomalyDetector) Run(ctx context.Context) {
	series, err := d.anomalies.GetHourlySpendSeries(ctx, 14)
	if err != nil {
		log.Printf("[anomaly] fetch series: %v", err)
		return
	}
	if len(series) < 7 {
		return
	}

	currentSpend, windowStart, err := d.anomalies.GetCurrentHourSpend(ctx)
	if err != nil {
		log.Printf("[anomaly] fetch current hour: %v", err)
		return
	}
	if currentSpend == 0 {
		return
	}

	hour := windowStart.Hour()
	var historical []float64
	for _, s := range series {
		if s.HourOfDay == hour {
			historical = append(historical, s.TotalUSD)
		}
	}
	if len(historical) < 3 {
		return
	}

	mean, stddev := computeStats(historical)
	if stddev == 0 {
		return
	}
	zScore := (currentSpend - mean) / stddev

	var severity string
	if zScore >= 4 {
		severity = "critical"
	} else if zScore >= 3 {
		severity = "warning"
	} else {
		return
	}

	details, _ := json.Marshal(map[string]interface{}{
		"hour_of_day": hour,
		"days_used":   len(historical),
	})

	anomaly := &repository.CostAnomaly{
		WindowStart:  windowStart,
		Metric:       "hourly_spend",
		Observed:     currentSpend,
		BaselineMean: &mean,
		BaselineStddev: &stddev,
		ZScore:       &zScore,
		Severity:     severity,
		Details:      details,
	}
	if err := d.anomalies.Create(ctx, anomaly); err != nil {
		log.Printf("[anomaly] create: %v", err)
		return
	}

	_ = d.publisher.Publish(ctx, "cost_anomaly", map[string]interface{}{
		"severity":    severity,
		"observed":    currentSpend,
		"z_score":     math.Round(zScore*100) / 100,
		"hour_of_day": hour,
	})
}

func computeStats(vals []float64) (mean, stddev float64) {
	n := float64(len(vals))
	for _, v := range vals {
		mean += v
	}
	mean /= n
	var variance float64
	for _, v := range vals {
		diff := v - mean
		variance += diff * diff
	}
	variance /= n
	stddev = math.Sqrt(variance)
	return
}
