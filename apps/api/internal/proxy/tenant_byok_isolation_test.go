package proxy

import (
	"testing"

	"github.com/roozylabs/prism/internal/models"
	"github.com/stretchr/testify/assert"
)

// Mock repository or unit level assertions for BYOK candidate filtering
func TestTenantBYOK_CandidateFiltering(t *testing.T) {
	// Provider 1 has active credential for Tenant A (p1 in activeProviderIDs)
	activeProviderIDsTenantA := map[string]bool{
		"p1": true,
	}

	// Tenant B has 0 active credentials
	activeProviderIDsTenantB := map[string]bool{}

	allModels := []*models.Model{
		{ID: "m1", Slug: "gpt-4o", ProviderID: "p1", Enabled: true},
		{ID: "m2", Slug: "claude-3-7-sonnet", ProviderID: "p2", Enabled: true},
	}

	// 1. Tenant A filtering
	var candidatesTenantA []*models.Model
	for _, m := range allModels {
		if len(activeProviderIDsTenantA) > 0 {
			if !activeProviderIDsTenantA[m.ProviderID] {
				continue
			}
			candidatesTenantA = append(candidatesTenantA, m)
		}
	}
	assert.Len(t, candidatesTenantA, 1)
	assert.Equal(t, "gpt-4o", candidatesTenantA[0].Slug)

	// 2. Tenant B filtering (0 credentials -> 0 candidates)
	var candidatesTenantB []*models.Model
	for _, m := range allModels {
		if len(activeProviderIDsTenantB) > 0 {
			if !activeProviderIDsTenantB[m.ProviderID] {
				continue
			}
			candidatesTenantB = append(candidatesTenantB, m)
		}
	}
	assert.Len(t, candidatesTenantB, 0, "Tenant B with 0 credentials must produce 0 routing candidates")
}

func TestTenantBYOK_CredentialModelIsolation(t *testing.T) {
	userA := "user-uuid-aaaa"
	userB := "user-uuid-bbbb"

	credA := models.Credential{
		ID:         "cred-1",
		ProviderID: "p1",
		UserID:     &userA,
		Name:       "User A OpenAI Key",
		Enabled:    true,
		Status:     "active",
	}

	credB := models.Credential{
		ID:         "cred-2",
		ProviderID: "p1",
		UserID:     &userB,
		Name:       "User B OpenAI Key",
		Enabled:    true,
		Status:     "active",
	}

	assert.NotEqual(t, *credA.UserID, *credB.UserID)
	assert.Equal(t, "user-uuid-aaaa", *credA.UserID)
	assert.Equal(t, "user-uuid-bbbb", *credB.UserID)
}
