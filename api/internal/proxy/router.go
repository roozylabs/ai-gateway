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
	case "opencode":
		return NewOpenCodeAdapter()
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

// ResolveWithFallback resolves routing for a request.
// If the gateway key has a ProviderID, it routes directly to that provider
// and selects credentials from its pool using the provider's routing strategy.
// Otherwise it falls back to model-based provider resolution.
func (r *Router) ResolveWithFallback(ctx context.Context, modelSlug string, gatewayKey *models.GatewayAPIKey, cooldown *goredis.CooldownStore) ([]*Route, error) {
	allowedModels := gatewayKey.AllowedModels

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

	var provider *models.Provider
	var model *models.Model

	// If gateway key is bound to a specific provider, use it directly
	if gatewayKey.ProviderID != nil && *gatewayKey.ProviderID != "" {
		var err error
		provider, err = r.providers.FindByID(ctx, *gatewayKey.ProviderID)
		if err != nil {
			return nil, fmt.Errorf("find provider for gateway key: %w", err)
		}
		if !provider.Enabled {
			return nil, ErrModelNotFound
		}

		// Try to find the model under this provider; if not found, create a virtual model
		model, err = r.models.FindBySlugAndProvider(ctx, modelSlug, provider.ID)
		if err != nil {
			// Model not explicitly registered — create virtual model for pass-through
			model = &models.Model{
				Name:       modelSlug,
				Slug:       modelSlug,
				ProviderID: provider.ID,
				Enabled:    true,
			}
		}
	} else {
		// Legacy behavior: resolve provider from model slug
		var err error
		model, err = r.models.FindBySlug(ctx, modelSlug)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, ErrModelNotFound
			}
			return nil, fmt.Errorf("find model: %w", err)
		}

		if !model.Enabled {
			return nil, ErrModelNotFound
		}

		provider, err = r.providers.FindByID(ctx, model.ProviderID)
		if err != nil {
			return nil, fmt.Errorf("find provider: %w", err)
		}

		if !provider.Enabled {
			return nil, ErrModelNotFound
		}
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
