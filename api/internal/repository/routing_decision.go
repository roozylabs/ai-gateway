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
	TaskType         sql.NullString  `json:"taskType,omitempty" db:"task_type"`
	Complexity       sql.NullString  `json:"complexity,omitempty" db:"complexity"`
	PolicyName       sql.NullString  `json:"policyName,omitempty" db:"policy_name"`
	Candidates       json.RawMessage `json:"candidates,omitempty" db:"candidates"`
	SelectedModel    sql.NullString  `json:"selectedModel,omitempty" db:"selected_model"`
	SelectedProvider sql.NullString  `json:"selectedProvider,omitempty" db:"selected_provider"`
	BudgetStatus     sql.NullString  `json:"budgetStatus,omitempty" db:"budget_status"`
	EstimatedCost    float64         `json:"estimatedCost" db:"estimated_cost"`
	ActualCost       float64         `json:"actualCost" db:"actual_cost"`
	DowngradeReason  sql.NullString  `json:"downgradeReason,omitempty" db:"downgrade_reason"`
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

	_, err := r.db.ExecContext(ctx,
		`INSERT INTO routing_decisions (id, request_id, user_id, task_type, complexity, policy_name,
		     candidates, selected_model, selected_provider, budget_status, estimated_cost, actual_cost,
		     downgrade_reason, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		decision.ID, decision.RequestID, decision.UserID, decision.TaskType, decision.Complexity,
		decision.PolicyName, candidates, decision.SelectedModel, decision.SelectedProvider,
		decision.BudgetStatus, decision.EstimatedCost, decision.ActualCost,
		decision.DowngradeReason, decision.CreatedAt,
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

	query := `SELECT id, request_id, user_id, task_type, complexity, policy_name,
		        candidates, selected_model, selected_provider, budget_status,
		        estimated_cost, actual_cost, downgrade_reason, created_at
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
		if err := rows.Scan(&d.ID, &d.RequestID, &d.UserID, &d.TaskType, &d.Complexity,
			&d.PolicyName, &d.Candidates, &d.SelectedModel, &d.SelectedProvider,
			&d.BudgetStatus, &d.EstimatedCost, &d.ActualCost, &d.DowngradeReason, &d.CreatedAt); err != nil {
			return nil, 0, err
		}
		decisions = append(decisions, d)
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
