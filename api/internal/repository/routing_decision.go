package repository

import (
	"context"
	"database/sql"
	"encoding/json"
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

func (r *RoutingDecisionRepository) ListByUserID(ctx context.Context, userID string, limit, offset int) ([]RoutingDecisionLog, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, request_id, user_id, task_type, complexity, policy_name,
		        candidates, selected_model, selected_provider, budget_status,
		        estimated_cost, actual_cost, downgrade_reason, created_at
		 FROM routing_decisions
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`, userID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var decisions []RoutingDecisionLog
	for rows.Next() {
		var d RoutingDecisionLog
		if err := rows.Scan(&d.ID, &d.RequestID, &d.UserID, &d.TaskType, &d.Complexity,
			&d.PolicyName, &d.Candidates, &d.SelectedModel, &d.SelectedProvider,
			&d.BudgetStatus, &d.EstimatedCost, &d.ActualCost, &d.DowngradeReason, &d.CreatedAt); err != nil {
			return nil, err
		}
		decisions = append(decisions, d)
	}
	return decisions, rows.Err()
}
