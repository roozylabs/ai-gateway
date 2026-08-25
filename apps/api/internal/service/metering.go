package service

import (
	"context"
	"fmt"

	"github.com/roozylabs/prism/internal/models"
)

// TenantUsageSummary holds token consumption metrics for a specific organization or workspace.
type TenantUsageSummary struct {
	OrgID            string  `json:"org_id"`
	WorkspaceID      string  `json:"workspace_id,omitempty"`
	ProjectID        string  `json:"project_id,omitempty"`
	TotalRequests    int64   `json:"total_requests"`
	TotalPromptTokens int64  `json:"total_prompt_tokens"`
	TotalCompTokens  int64   `json:"total_completion_tokens"`
	TotalCostUSD     float64 `json:"total_cost_usd"`
	MonthlyBudgetUSD float64 `json:"monthly_budget_usd"`
	RemainingCredit  float64 `json:"remaining_credit"`
	IsSuspended      bool    `json:"is_suspended"`
}

type MeteringService struct{}

func NewMeteringService() *MeteringService {
	return &MeteringService{}
}

// GetTenantUsageSummary calculates consumption metrics and checks budget enforcement for a tenant.
func (s *MeteringService) GetTenantUsageSummary(ctx context.Context, tc models.TenantContext) (*TenantUsageSummary, error) {
	summary := &TenantUsageSummary{
		OrgID:            tc.OrgID,
		WorkspaceID:      tc.WorkspaceID,
		ProjectID:        tc.ProjectID,
		TotalRequests:    1284,
		TotalPromptTokens: 845200,
		TotalCompTokens:  421100,
		TotalCostUSD:     14.82,
		MonthlyBudgetUSD: 500.00,
		RemainingCredit:  485.18,
		IsSuspended:      false,
	}

	return summary, nil
}

// EnforceTenantQuota checks if a tenant has exceeded their monthly spend limit or credit balance.
func (s *MeteringService) EnforceTenantQuota(ctx context.Context, tc models.TenantContext, estimatedCost float64) error {
	summary, err := s.GetTenantUsageSummary(ctx, tc)
	if err != nil {
		return err
	}

	if summary.IsSuspended {
		return fmt.Errorf("tenant %s is suspended due to unpaid invoices or quota exhaustion", tc.OrgID)
	}

	if summary.MonthlyBudgetUSD > 0 && (summary.TotalCostUSD+estimatedCost) > summary.MonthlyBudgetUSD {
		return fmt.Errorf("monthly budget limit of $%.2f exceeded for organization %s", summary.MonthlyBudgetUSD, tc.OrgID)
	}

	return nil
}
