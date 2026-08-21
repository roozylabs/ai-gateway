package proxy

import (
	"context"
	"math"

	"github.com/roozylabs/ai-gateway/internal/models"
	"github.com/roozylabs/ai-gateway/internal/repository"
)

type BudgetManager struct {
	budgetRepo *repository.BudgetRepository
}

func NewBudgetManager(budgetRepo *repository.BudgetRepository) *BudgetManager {
	return &BudgetManager{budgetRepo: budgetRepo}
}

func (bm *BudgetManager) GetStatus(ctx context.Context, userID string) (*models.BudgetStatus, error) {
	budgets, err := bm.budgetRepo.ListByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if len(budgets) == 0 {
		return nil, nil
	}

	budget := budgets[0]
	if !budget.Enabled {
		return nil, nil
	}

	monthlySpent, err := bm.budgetRepo.GetTotalMonthlySpend(ctx, userID)
	if err != nil {
		return nil, err
	}
	dailySpent, err := bm.budgetRepo.GetTotalDailySpend(ctx, userID)
	if err != nil {
		return nil, err
	}

	monthlyRemaining := budget.MonthlyLimit - monthlySpent
	dailyRemaining := budget.DailyLimit - dailySpent
	if monthlyRemaining < 0 {
		monthlyRemaining = 0
	}
	if dailyRemaining < 0 {
		dailyRemaining = 0
	}

	var usagePercent float64
	if budget.MonthlyLimit > 0 {
		usagePercent = monthlySpent / budget.MonthlyLimit
	} else {
		usagePercent = 0
	}

	status := computeBudgetStatus(usagePercent, budget.WarningThreshold, budget.CriticalThreshold)

	return &models.BudgetStatus{
		Budget:           &budget,
		MonthlySpent:     monthlySpent,
		DailySpent:       dailySpent,
		MonthlyRemaining: monthlyRemaining,
		DailyRemaining:   dailyRemaining,
		UsagePercent:     math.Round(usagePercent*100*100) / 100,
		Status:           status,
	}, nil
}

func computeBudgetStatus(usagePercent, warningThreshold, criticalThreshold float64) string {
	if usagePercent >= 1.0 {
		return "exceeded"
	}
	if usagePercent >= criticalThreshold {
		return "critical"
	}
	if usagePercent >= warningThreshold {
		return "warning"
	}
	return "healthy"
}
