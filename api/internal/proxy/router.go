package proxy

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/roozylabs/ai-gateway/internal/models"
	goredis "github.com/roozylabs/ai-gateway/internal/redis"
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
	settings  *repository.SettingRepository
}

func NewRouter(
	models *repository.ModelRepository,
	providers *repository.ProviderRepository,
	creds *repository.CredentialRepository,
	settings *repository.SettingRepository,
) *Router {
	return &Router{
		models:    models,
		providers: providers,
		creds:     creds,
		settings:  settings,
	}
}

type Route struct {
	Model      *models.Model
	Provider   *models.Provider
	Credential *models.Credential
	Adapter    ProviderAdapter
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

	strategy := r.resolveStrategy(provider)

	creds, err := r.selectByStrategy(ctx, provider.ID, strategy)
	if err != nil {
		return nil, err
	}

	if len(creds) == 0 {
		return nil, ErrNoCredentials
	}

	adapter := r.getAdapter(provider.Type)

	return &Route{
		Model:      model,
		Provider:   provider,
		Credential: &creds[0],
		Adapter:    adapter,
	}, nil
}

func (r *Router) ResolveWithFallback(ctx context.Context, modelSlug string, allowedModels []string, cooldown *goredis.CooldownStore) ([]*Route, error) {
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

	strategy := r.resolveStrategy(provider)

	allCreds, err := r.selectByStrategy(ctx, provider.ID, strategy)
	if err != nil {
		return nil, fmt.Errorf("select credentials: %w", err)
	}

	var routes []*Route
	for _, cred := range allCreds {
		c := cred
		cooling, _ := cooldown.IsCoolingDown(ctx, c.ID)
		if cooling {
			continue
		}
		adapter := r.getAdapter(provider.Type)
		routes = append(routes, &Route{
			Model:      model,
			Provider:   provider,
			Credential: &c,
			Adapter:    adapter,
		})
	}

	if len(routes) == 0 {
		return nil, ErrNoCredentials
	}
	return routes, nil
}

func (r *Router) resolveStrategy(provider *models.Provider) string {
	if provider.RoutingStrategy != "" {
		return provider.RoutingStrategy
	}
	defaultStrategy, _ := r.settings.Get(context.Background(), "default_routing_strategy")
	if defaultStrategy != "" {
		return defaultStrategy
	}
	return "round_robin"
}

func (r *Router) selectByStrategy(ctx context.Context, providerID, strategy string) ([]models.Credential, error) {
	switch strategy {
	case "lru":
		return r.creds.FindLRU(ctx, providerID)
	case "fallback_cascade":
		return r.creds.FindAllActiveByProviderID(ctx, providerID)
	default:
		return r.creds.FindRoundRobin(ctx, providerID)
	}
}
