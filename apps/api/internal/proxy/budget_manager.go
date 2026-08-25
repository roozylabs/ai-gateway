package proxy

import (
	"context"
	"math"
	"sync"
	"time"

	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/repository"
)

const budgetSpendCacheTTL = 10 * time.Second

type budgetSpendCacheEntry struct {
	monthly   float64
	daily     float64
	fetchedAt time.Time
}

type BudgetManager struct {
	budgetRepo *repository.BudgetRepository
	spendCache sync.Map // userID -> budgetSpendCacheEntry
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

	monthlySpent, dailySpent, err := bm.getSpendCached(ctx, userID)
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

func (bm *BudgetManager) getSpendCached(ctx context.Context, userID string) (float64, float64, error) {
	if v, ok := bm.spendCache.Load(userID); ok {
		entry := v.(budgetSpendCacheEntry)
		if time.Since(entry.fetchedAt) < budgetSpendCacheTTL {
			return entry.monthly, entry.daily, nil
		}
		bm.spendCache.Delete(userID)
	}
	monthly, daily, err := bm.budgetRepo.GetCombinedSpend(ctx, userID)
	if err != nil {
		return 0, 0, err
	}
	bm.spendCache.Store(userID, budgetSpendCacheEntry{
		monthly:   monthly,
		daily:     daily,
		fetchedAt: time.Now(),
	})
	return monthly, daily, nil
}
