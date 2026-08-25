package repository

import (
	"context"
	"sync"
	"time"

	"github.com/roozylabs/prism/internal/models"
)

type gwKeyCacheEntry struct {
	key        *models.GatewayAPIKey
	insertedAt time.Time
}

// GatewayKeyCache wraps GatewayKeyRepository with a short-TTL in-memory cache
// keyed by key hash, eliminating a per-request DB roundtrip on the gateway hot path.
type GatewayKeyCache struct {
	repo  *GatewayKeyRepository
	cache sync.Map
	ttl   time.Duration
}

func NewGatewayKeyCache(repo *GatewayKeyRepository) *GatewayKeyCache {
	return &GatewayKeyCache{
		repo: repo,
		ttl:  30 * time.Second,
	}
}

func (c *GatewayKeyCache) FindByKeyHash(ctx context.Context, keyHash string) (*models.GatewayAPIKey, error) {
	if v, ok := c.cache.Load(keyHash); ok {
		entry := v.(gwKeyCacheEntry)
		if time.Since(entry.insertedAt) < c.ttl {
			return entry.key, nil
		}
		c.cache.Delete(keyHash)
	}

	key, err := c.repo.FindByKeyHash(ctx, keyHash)
	if err != nil {
		return nil, err
	}

	c.cache.Store(keyHash, gwKeyCacheEntry{
		key:        key,
		insertedAt: time.Now(),
	})
	return key, nil
}

func (c *GatewayKeyCache) FindByKeyPrefix(ctx context.Context, keyPrefix string) (*models.GatewayAPIKey, error) {
	return c.repo.FindByKeyPrefix(ctx, keyPrefix)
}

// Invalidate forces a cache miss for the given hash on next lookup.
func (c *GatewayKeyCache) Invalidate(keyHash string) {
	c.cache.Delete(keyHash)
}
