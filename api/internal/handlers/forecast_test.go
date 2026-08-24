package handlers

import (
	"testing"

	"github.com/roozylabs/ai-gateway/internal/repository"
	"github.com/stretchr/testify/assert"
)

func makeSeries(prices ...float64) []repository.DailySpend {
	var s []repository.DailySpend
	for _, p := range prices {
		s = append(s, repository.DailySpend{Date: "2026-01-01", TotalUSD: p})
	}
	return s
}

func TestComputeForecastRising(t *testing.T) {
	series := makeSeries(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14)
	f := ComputeForecast(series)
	assert.Equal(t, "increasing", f.TrendDirection)
	assert.Greater(t, f.WeightedDailyAvg, windowMean(series))
	assert.Greater(t, f.ProjectedMonthly, 0.0)
}

func TestComputeForecastFlat(t *testing.T) {
	series := makeSeries(5, 5, 5, 5, 5, 5, 5, 5, 5, 5)
	f := ComputeForecast(series)
	assert.Equal(t, "stable", f.TrendDirection)
	assert.Equal(t, 5.0, f.WeightedDailyAvg)
	assert.Equal(t, 150.0, f.ProjectedMonthly)
}

func TestComputeForecastDecreasing(t *testing.T) {
	series := makeSeries(20, 18, 16, 14, 12, 10, 8, 6, 4, 2, 1, 1, 1, 1)
	f := ComputeForecast(series)
	assert.Equal(t, "decreasing", f.TrendDirection)
}

func TestComputeForecastEmpty(t *testing.T) {
	f := ComputeForecast(nil)
	assert.Equal(t, 0.0, f.WeightedDailyAvg)
	assert.Equal(t, 0.0, f.ProjectedMonthly)
	assert.Equal(t, "stable", f.TrendDirection)
}

func TestComputeForecastShortSeries(t *testing.T) {
	series := makeSeries(3, 4, 5)
	f := ComputeForecast(series)
	assert.Equal(t, "stable", f.TrendDirection)
	assert.Greater(t, f.WeightedDailyAvg, 0.0)
}
