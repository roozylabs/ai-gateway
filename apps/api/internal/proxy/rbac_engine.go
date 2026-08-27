package proxy

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/roozylabs/prism/internal/models"
)

type PolicyFinder interface {
	ListByUserID(ctx context.Context, userID string) ([]models.GovernancePolicy, error)
}

type RBACEngine struct {
	policies PolicyFinder
}

func NewRBACEngine(policies PolicyFinder) *RBACEngine {
	return &RBACEngine{policies: policies}
}

func matchPattern(pattern, target string) bool {
	if pattern == "" || pattern == "*" {
		return true
	}
	if target == "" {
		return false
	}
	pattern = strings.ToLower(pattern)
	target = strings.ToLower(target)
	matched, err := filepath.Match(pattern, target)
	if err == nil && matched {
		return true
	}
	return strings.Contains(target, strings.Trim(pattern, "*"))
}

func (e *RBACEngine) Evaluate(ctx context.Context, userID string, req models.RBACEvaluationRequest) (*models.RBACEvaluationResult, error) {
	policies, err := e.policies.ListByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list governance policies: %w", err)
	}

	if len(policies) == 0 {
		return &models.RBACEvaluationResult{
			Allowed:        true,
			Reason:         "no explicit governance policies defined; default allow",
			EvaluatedCount: 0,
		}, nil
	}

	var matchedAllow *models.GovernancePolicy
	evaluated := 0

	for i := range policies {
		p := &policies[i]
		if !p.Enabled {
			continue
		}
		evaluated++

		// Match role if specified and not wildcard/admin
		if p.Role != "" && p.Role != "*" && req.Role != "" && !strings.EqualFold(p.Role, req.Role) {
			continue
		}

		// Match Agent Pattern
		if !matchPattern(p.AgentPattern, req.AgentName) {
			continue
		}

		// Match Model Pattern
		if req.ModelSlug != "" && !matchPattern(p.ModelPattern, req.ModelSlug) {
			continue
		}

		// Match Tool Pattern (if policy targets specific tool, request tool must match)
		if p.ToolPattern != "" && p.ToolPattern != "*" && !matchPattern(p.ToolPattern, req.ToolName) {
			continue
		}

		// Match Resource Pattern (if policy targets specific resource, request resource must match)
		if p.ResourcePattern != "" && p.ResourcePattern != "*" && !matchPattern(p.ResourcePattern, req.ResourceName) {
			continue
		}

		// If policy matches:
		if strings.EqualFold(p.Effect, "deny") {
			return &models.RBACEvaluationResult{
				Allowed:        false,
				MatchedPolicy:  p,
				Reason:         fmt.Sprintf("access denied by policy %q (%s)", p.Name, p.ID),
				EvaluatedCount: evaluated,
			}, nil
		}

		if matchedAllow == nil && strings.EqualFold(p.Effect, "allow") {
			matchedAllow = p
		}
	}

	if matchedAllow != nil {
		return &models.RBACEvaluationResult{
			Allowed:        true,
			MatchedPolicy:  matchedAllow,
			Reason:         fmt.Sprintf("access granted by policy %q (%s)", matchedAllow.Name, matchedAllow.ID),
			EvaluatedCount: evaluated,
		}, nil
	}

	return &models.RBACEvaluationResult{
		Allowed:        true,
		Reason:         "no matching deny policy found; default allow",
		EvaluatedCount: evaluated,
	}, nil
}
