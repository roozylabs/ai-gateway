package proxy

import (
	"testing"

	"github.com/roozylabs/prism/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestAgentEnforcer_AllowedModelsFilter(t *testing.T) {
	agent := &models.Agent{
		ID:            "agent-1",
		Name:          "Frontend Agent",
		AllowedModels: []string{"prism-auto", "claude-sonnet-3-5", "gpt-4o-mini"},
	}

	candidates := []string{"claude-sonnet-3-5", "gpt-4o", "gpt-4o-mini", "gemini-2.5-flash"}
	filtered := filterCandidatesByAgent(candidates, agent)

	assert.Equal(t, []string{"claude-sonnet-3-5", "gpt-4o-mini"}, filtered)
}

func filterCandidatesByAgent(candidates []string, agent *models.Agent) []string {
	if agent == nil || len(agent.AllowedModels) == 0 {
		return candidates
	}
	allowedMap := make(map[string]bool)
	for _, m := range agent.AllowedModels {
		allowedMap[m] = true
	}
	var res []string
	for _, c := range candidates {
		if allowedMap["*"] || allowedMap[c] {
			res = append(res, c)
		}
	}
	return res
}
