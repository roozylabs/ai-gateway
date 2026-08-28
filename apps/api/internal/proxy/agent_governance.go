package proxy

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/roozylabs/prism/internal/models"
)

type AgentFinder interface {
	FindByUserAndName(ctx context.Context, userID, name string) (*models.Agent, error)
}

type AgentGovernanceEngine struct {
	agents AgentFinder
}

func NewAgentGovernanceEngine(agents AgentFinder) *AgentGovernanceEngine {
	return &AgentGovernanceEngine{agents: agents}
}

func (g *AgentGovernanceEngine) ValidateAgentModelAccess(ctx context.Context, userID, agentName, modelSlug string) (*models.AgentGovernanceCheckResult, error) {
	if agentName == "" {
		return &models.AgentGovernanceCheckResult{ModelAllowed: true}, nil
	}

	ag, err := g.agents.FindByUserAndName(ctx, userID, agentName)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "no rows") || strings.Contains(err.Error(), "not found") {
			return &models.AgentGovernanceCheckResult{AgentName: agentName, ModelAllowed: true}, nil
		}
		return nil, fmt.Errorf("resolve agent %q: %w", agentName, err)
	}
	if !ag.Enabled {
		return &models.AgentGovernanceCheckResult{
			AgentName:    agentName,
			ModelAllowed: false,
			Reason:       fmt.Sprintf("agent %q is disabled", agentName),
		}, nil
	}

	// 1. Evaluate explicit DENY rules first (DENY > ALLOW precedence)
	for _, rule := range ag.AllowedModels {
		if strings.HasPrefix(rule, "!") || strings.HasPrefix(rule, "-") || strings.HasPrefix(strings.ToLower(rule), "deny:") {
			deniedTarget := strings.TrimPrefix(strings.TrimPrefix(strings.TrimPrefix(rule, "!"), "-"), "deny:")
			if strings.EqualFold(deniedTarget, modelSlug) {
				return &models.AgentGovernanceCheckResult{
					AgentName:    agentName,
					ModelAllowed: false,
					Reason:       fmt.Sprintf("model %q explicitly denied for agent %q", modelSlug, agentName),
				}, nil
			}
		}
	}

	if len(ag.AllowedModels) == 0 || strings.EqualFold(modelSlug, "prism-auto") || strings.EqualFold(modelSlug, "auto") {
		return &models.AgentGovernanceCheckResult{AgentName: agentName, ModelAllowed: true}, nil
	}

	// 2. Evaluate ALLOW rules
	for _, allowed := range ag.AllowedModels {
		if strings.EqualFold(allowed, modelSlug) || allowed == "*" {
			return &models.AgentGovernanceCheckResult{AgentName: agentName, ModelAllowed: true}, nil
		}
	}

	return &models.AgentGovernanceCheckResult{
		AgentName:    agentName,
		ModelAllowed: false,
		Reason:       fmt.Sprintf("model %q is not permitted for agent %q", modelSlug, agentName),
	}, nil
}

func (g *AgentGovernanceEngine) ValidateAgentToolAccess(ctx context.Context, userID, agentName, toolName string) (*models.AgentGovernanceCheckResult, error) {
	if agentName == "" {
		return &models.AgentGovernanceCheckResult{ToolAllowed: true}, nil
	}

	ag, err := g.agents.FindByUserAndName(ctx, userID, agentName)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "no rows") || strings.Contains(err.Error(), "not found") {
			return &models.AgentGovernanceCheckResult{AgentName: agentName, ToolAllowed: true}, nil
		}
		return nil, fmt.Errorf("resolve agent %q: %w", agentName, err)
	}
	if !ag.Enabled {
		return &models.AgentGovernanceCheckResult{
			AgentName:   agentName,
			ToolAllowed: false,
			Reason:      fmt.Sprintf("agent %q is disabled", agentName),
		}, nil
	}

	// 1. Evaluate explicit DENY rules first (DENY > ALLOW precedence)
	for _, rule := range ag.AllowedTools {
		if strings.HasPrefix(rule, "!") || strings.HasPrefix(rule, "-") || strings.HasPrefix(strings.ToLower(rule), "deny:") {
			deniedTarget := strings.TrimPrefix(strings.TrimPrefix(strings.TrimPrefix(rule, "!"), "-"), "deny:")
			if strings.EqualFold(deniedTarget, toolName) {
				return &models.AgentGovernanceCheckResult{
					AgentName:   agentName,
					ToolAllowed: false,
					Reason:      fmt.Sprintf("tool %q explicitly denied for agent %q", toolName, agentName),
				}, nil
			}
		}
	}

	if len(ag.AllowedTools) == 0 {
		return &models.AgentGovernanceCheckResult{AgentName: agentName, ToolAllowed: true}, nil
	}

	// 2. Evaluate ALLOW rules
	for _, allowed := range ag.AllowedTools {
		if strings.EqualFold(allowed, toolName) || allowed == "*" {
			return &models.AgentGovernanceCheckResult{AgentName: agentName, ToolAllowed: true}, nil
		}
	}

	return &models.AgentGovernanceCheckResult{
		AgentName:   agentName,
		ToolAllowed: false,
		Reason:      fmt.Sprintf("tool %q is not permitted for agent %q", toolName, agentName),
	}, nil
}
