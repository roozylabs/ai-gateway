package proxy

import (
	"testing"
)

func TestComputeBudgetStatus_Healthy(t *testing.T) {
	if s := computeBudgetStatus(0.50, 0.80, 0.90); s != "healthy" {
		t.Errorf("expected healthy, got %s", s)
	}
}

func TestComputeBudgetStatus_Warning(t *testing.T) {
	if s := computeBudgetStatus(0.85, 0.80, 0.90); s != "warning" {
		t.Errorf("expected warning, got %s", s)
	}
}

func TestComputeBudgetStatus_Critical(t *testing.T) {
	if s := computeBudgetStatus(0.95, 0.80, 0.90); s != "critical" {
		t.Errorf("expected critical, got %s", s)
	}
}

func TestComputeBudgetStatus_Exceeded(t *testing.T) {
	if s := computeBudgetStatus(1.00, 0.80, 0.90); s != "exceeded" {
		t.Errorf("expected exceeded, got %s", s)
	}
}

func TestComputeBudgetStatus_ExceededOver(t *testing.T) {
	if s := computeBudgetStatus(1.20, 0.80, 0.90); s != "exceeded" {
		t.Errorf("expected exceeded, got %s", s)
	}
}

func TestComputeBudgetStatus_CustomThresholds(t *testing.T) {
	if s := computeBudgetStatus(0.70, 0.50, 0.75); s != "warning" {
		t.Errorf("expected warning at 70%% with 50%% threshold, got %s", s)
	}
	if s := computeBudgetStatus(0.75, 0.50, 0.75); s != "critical" {
		t.Errorf("expected critical at 75%% with 75%% threshold, got %s", s)
	}
}

func TestComputeBudgetStatus_ExactlyAtThreshold(t *testing.T) {
	if s := computeBudgetStatus(0.80, 0.80, 0.90); s != "warning" {
		t.Errorf("expected warning at exactly 80%%, got %s", s)
	}
	if s := computeBudgetStatus(0.90, 0.80, 0.90); s != "critical" {
		t.Errorf("expected critical at exactly 90%%, got %s", s)
	}
}
