package proxy

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/roozylabs/ai-gateway/internal/models"
	"github.com/roozylabs/ai-gateway/internal/repository"
)

var (
	ErrModelNotAllowed = errors.New("model not allowed")
	ErrModelNotFound   = errors.New("model not found")
	ErrNoCredentials   = errors.New("no credentials available for provider")
)

type Router struct {
	models    *repository.ModelRepository
	providers *repository.ProviderRepository
	creds     *repository.CredentialRepository
}

func NewRouter(
	models *repository.ModelRepository,
	providers *repository.ProviderRepository,
	creds *repository.CredentialRepository,
) *Router {
	return &Router{
		models:    models,
		providers: providers,
		creds:     creds,
	}
}

type Route struct {
	Model      *models.Model
	Provider   *models.Provider
	Credential *models.Credential
	Adapter    ProviderAdapter
}

func (r *Router) Resolve(ctx context.Context, modelSlug string, allowedModels []string) (*Route, error) {
	if len(allowedModels) > 0 {
		allowed := false
		for _, m := range allowedModels {
			if m == modelSlug || m == "*" {
				allowed = true
				break
			}
		}
		if !allowed {
			return nil, ErrModelNotAllowed
		}
	}

	model, err := r.models.FindBySlug(ctx, modelSlug)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrModelNotFound
		}
		return nil, fmt.Errorf("find model: %w", err)
	}

	if !model.Enabled {
		return nil, ErrModelNotFound
	}

	provider, err := r.providers.FindByID(ctx, model.ProviderID)
	if err != nil {
		return nil, fmt.Errorf("find provider: %w", err)
	}

	if !provider.Enabled {
		return nil, ErrModelNotFound
	}

	cred, err := r.creds.FindActiveByProviderID(ctx, provider.ID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNoCredentials
		}
		return nil, fmt.Errorf("find credential: %w", err)
	}

	adapter := r.getAdapter(provider.Type)

	return &Route{
		Model:      model,
		Provider:   provider,
		Credential: cred,
		Adapter:    adapter,
	}, nil
}

func (r *Router) getAdapter(providerType string) ProviderAdapter {
	switch providerType {
	case "openai":
		return NewOpenAIAdapter()
	case "anthropic":
		return NewAnthropicAdapter()
	default:
		return NewOpenAIAdapter()
	}
}
