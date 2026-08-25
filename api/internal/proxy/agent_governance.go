package proxy

import (
	"context"
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
		return nil, fmt.Errorf("resolve agent %q: %w", agentName, err)
	}
	if !ag.Enabled {
		return &models.AgentGovernanceCheckResult{
			AgentName:    agentName,
			ModelAllowed: false,
			Reason:       fmt.Sprintf("agent %q is disabled", agentName),
		}, nil
	}

	if len(ag.AllowedModels) == 0 {
		return &models.AgentGovernanceCheckResult{AgentName: agentName, ModelAllowed: true}, nil
	}

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
		return nil, fmt.Errorf("resolve agent %q: %w", agentName, err)
	}
	if !ag.Enabled {
		return &models.AgentGovernanceCheckResult{
			AgentName:   agentName,
			ToolAllowed: false,
			Reason:      fmt.Sprintf("agent %q is disabled", agentName),
		}, nil
	}

	if len(ag.AllowedTools) == 0 {
		return &models.AgentGovernanceCheckResult{AgentName: agentName, ToolAllowed: true}, nil
	}

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
