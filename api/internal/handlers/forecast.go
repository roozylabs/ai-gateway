package handlers

import (
	"math"

	"github.com/roozylabs/prism/internal/repository"
)

type SpendForecast struct {
	WeightedDailyAvg float64 `json:"weightedDailyAvg"`
	TrendPercent     float64 `json:"trendPercent"`
	TrendDirection   string  `json:"trendDirection"`
	ProjectedMonthly float64 `json:"projectedMonthly"`
}

func ComputeForecast(series []repository.DailySpend) SpendForecast {
	f := SpendForecast{TrendDirection: "stable"}
	n := len(series)
	if n == 0 {
		return f
	}

	var weightedSum, weightSum float64
	var naiveSum float64
	for i, s := range series {
		w := float64(i + 1)
		weightedSum += w * s.TotalUSD
		weightSum += w
		naiveSum += s.TotalUSD
	}
	wma := weightedSum / weightSum

	recentStart := n - 7
	if recentStart < 0 {
		recentStart = 0
	}
	recent := series[recentStart:]
	priorEnd := recentStart
	priorStart := priorEnd - 7
	if priorStart < 0 {
		priorStart = 0
	}
	prior := series[priorStart:priorEnd]

	trendPct := 0.0
	if len(recent) > 0 && len(prior) > 0 {
		recentMean := windowMean(recent)
		priorMean := windowMean(prior)
		trendPct = (recentMean - priorMean) / math.Max(priorMean, 0.01) * 100
	}

	direction := "stable"
	if trendPct > 10 {
		direction = "increasing"
	} else if trendPct < -10 {
		direction = "decreasing"
	}

	return SpendForecast{
		WeightedDailyAvg: round2(wma),
		TrendPercent:     round1(trendPct),
		TrendDirection:   direction,
		ProjectedMonthly: round2(wma * 30),
	}
}

func windowMean(series []repository.DailySpend) float64 {
	if len(series) == 0 {
		return 0
	}
	sum := 0.0
	for _, s := range series {
		sum += s.TotalUSD
	}
	return sum / float64(len(series))
}

func round2(v float64) float64  { return math.Round(v*100) / 100 }
func round1(v float64) float64  { return math.Round(v*10) / 10 }
