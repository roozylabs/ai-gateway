package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type RoutingDecisionLog struct {
	ID               string          `json:"id" db:"id"`
	RequestID        string          `json:"requestId" db:"request_id"`
	UserID           string          `json:"userId" db:"user_id"`
	PromptPreview    string          `json:"promptPreview,omitempty" db:"prompt_preview"`
	TaskType         string          `json:"taskType,omitempty" db:"task_type"`
	Complexity       string          `json:"complexity,omitempty" db:"complexity"`
	PolicyName       string          `json:"policyName,omitempty" db:"policy_name"`
	Candidates       json.RawMessage `json:"candidates,omitempty" db:"candidates"`
	SelectedModel    string          `json:"selectedModel,omitempty" db:"selected_model"`
	SelectedProvider string          `json:"selectedProvider,omitempty" db:"selected_provider"`
	BudgetStatus     string          `json:"budgetStatus,omitempty" db:"budget_status"`
	EstimatedCost    float64         `json:"estimatedCost" db:"estimated_cost"`
	ActualCost       float64         `json:"actualCost" db:"actual_cost"`
	DowngradeReason  string          `json:"downgradeReason,omitempty" db:"downgrade_reason"`
	ScoresBreakdown  json.RawMessage `json:"scoresBreakdown,omitempty" db:"scores_breakdown"`
	CreatedAt        time.Time       `json:"createdAt" db:"created_at"`
}

type RoutingDecisionRepository struct {
	db *sql.DB
}

func NewRoutingDecisionRepository(db *sql.DB) *RoutingDecisionRepository {
	return &RoutingDecisionRepository{db: db}
}

func (r *RoutingDecisionRepository) Create(ctx context.Context, decision *RoutingDecisionLog) error {
	if decision.ID == "" {
		decision.ID = uuid.New().String()
	}
	if decision.CreatedAt.IsZero() {
		decision.CreatedAt = time.Now()
	}

	var candidates interface{}
	if len(decision.Candidates) > 0 {
		candidates = []byte(decision.Candidates)
	} else {
		candidates = nil
	}

	var scoresBreakdown interface{}
	if len(decision.ScoresBreakdown) > 0 {
		scoresBreakdown = []byte(decision.ScoresBreakdown)
	} else {
		scoresBreakdown = nil
	}

	_, err := r.db.ExecContext(ctx,
		`INSERT INTO routing_decisions (id, request_id, user_id, prompt_preview, task_type, complexity, policy_name,
		     candidates, selected_model, selected_provider, budget_status, estimated_cost, actual_cost,
		     downgrade_reason, scores_breakdown, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
		decision.ID, decision.RequestID, decision.UserID,
		sql.NullString{String: decision.PromptPreview, Valid: decision.PromptPreview != ""},
		sql.NullString{String: decision.TaskType, Valid: decision.TaskType != ""},
		sql.NullString{String: decision.Complexity, Valid: decision.Complexity != ""},
		sql.NullString{String: decision.PolicyName, Valid: decision.PolicyName != ""},
		candidates,
		sql.NullString{String: decision.SelectedModel, Valid: decision.SelectedModel != ""},
		sql.NullString{String: decision.SelectedProvider, Valid: decision.SelectedProvider != ""},
		sql.NullString{String: decision.BudgetStatus, Valid: decision.BudgetStatus != ""},
		decision.EstimatedCost, decision.ActualCost,
		sql.NullString{String: decision.DowngradeReason, Valid: decision.DowngradeReason != ""},
		scoresBreakdown,
		decision.CreatedAt,
	)
	return err
}

func (r *RoutingDecisionRepository) ListWithFilter(ctx context.Context, userID string, limit, offset int) ([]RoutingDecisionLog, int64, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	query := `SELECT id, request_id, user_id, prompt_preview, task_type, complexity, policy_name,
		        candidates, selected_model, selected_provider, budget_status,
		        estimated_cost, actual_cost, downgrade_reason, scores_breakdown, created_at
		 FROM routing_decisions WHERE 1=1`
	countQuery := `SELECT COUNT(*) FROM routing_decisions WHERE 1=1`

	var args []interface{}
	var countArgs []interface{}

	if userID != "" {
		args = append(args, userID)
		countArgs = append(countArgs, userID)
		filter := fmt.Sprintf(" AND user_id = $%d", len(args))
		query += filter
		countQuery += filter
	}

	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query += " ORDER BY created_at DESC"

	args = append(args, limit)
	query += fmt.Sprintf(" LIMIT $%d", len(args))

	args = append(args, offset)
	query += fmt.Sprintf(" OFFSET $%d", len(args))

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var decisions []RoutingDecisionLog
	for rows.Next() {
		var d RoutingDecisionLog
		var promptPreview, taskType, complexity, policyName, selectedModel, selectedProvider, budgetStatus, downgradeReason sql.NullString
		if err := rows.Scan(&d.ID, &d.RequestID, &d.UserID, &promptPreview, &taskType, &complexity,
			&policyName, &d.Candidates, &selectedModel, &selectedProvider,
			&budgetStatus, &d.EstimatedCost, &d.ActualCost, &downgradeReason, &d.ScoresBreakdown, &d.CreatedAt); err != nil {
			return nil, 0, err
		}
		d.PromptPreview = promptPreview.String
		d.TaskType = taskType.String
		d.Complexity = complexity.String
		d.PolicyName = policyName.String
		d.SelectedModel = selectedModel.String
		d.SelectedProvider = selectedProvider.String
		d.BudgetStatus = budgetStatus.String
		d.DowngradeReason = downgradeReason.String
		decisions = append(decisions, d)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	if decisions == nil {
		decisions = []RoutingDecisionLog{}
	}
	return decisions, total, nil
}

func (r *RoutingDecisionRepository) ListByUserID(ctx context.Context, userID string, limit, offset int) ([]RoutingDecisionLog, error) {
	decisions, _, err := r.ListWithFilter(ctx, userID, limit, offset)
	return decisions, err
}
