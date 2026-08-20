package redis

import (
	"context"
	"fmt"
	"strings"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

type CooldownStore struct {
	rdb *goredis.Client
}

func NewCooldownStore(rdb *goredis.Client) *CooldownStore {
	return &CooldownStore{rdb: rdb}
}

func (s *CooldownStore) SetCooldown(ctx context.Context, credentialID string, seconds int) error {
	key := fmt.Sprintf("credential:%s:cooldown", credentialID)
	return s.rdb.Set(ctx, key, "1", time.Duration(seconds)*time.Second).Err()
}

func (s *CooldownStore) IsCoolingDown(ctx context.Context, credentialID string) (bool, error) {
	key := fmt.Sprintf("credential:%s:cooldown", credentialID)
	exists, err := s.rdb.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return exists > 0, nil
}

func (s *CooldownStore) GetCooldownTTL(ctx context.Context, credentialID string) (time.Duration, error) {
	key := fmt.Sprintf("credential:%s:cooldown", credentialID)
	return s.rdb.TTL(ctx, key).Result()
}

func (s *CooldownStore) RemoveCooldown(ctx context.Context, credentialID string) error {
	key := fmt.Sprintf("credential:%s:cooldown", credentialID)
	return s.rdb.Del(ctx, key).Err()
}

func (s *CooldownStore) SetAccessToken(ctx context.Context, credentialID, token string, ttlSeconds int) error {
	key := fmt.Sprintf("credential:%s:access_token", credentialID)
	return s.rdb.Set(ctx, key, token, time.Duration(ttlSeconds)*time.Second).Err()
}

func (s *CooldownStore) GetAccessToken(ctx context.Context, credentialID string) (string, error) {
	key := fmt.Sprintf("credential:%s:access_token", credentialID)
	return s.rdb.Get(ctx, key).Result()
}

func (s *CooldownStore) DeleteAccessToken(ctx context.Context, credentialID string) error {
	key := fmt.Sprintf("credential:%s:access_token", credentialID)
	return s.rdb.Del(ctx, key).Err()
}

type ActiveStreamsSummary struct {
	TotalActive int64            `json:"totalActive"`
	ByModel     map[string]int64 `json:"byModel"`
	ByKey       map[string]int64 `json:"byKey"`
}

func (s *CooldownStore) IncrementActiveStream(ctx context.Context, modelSlug, gatewayKeyID string) error {
	pipe := s.rdb.Pipeline()
	pipe.Incr(ctx, "gateway:active:global")
	if modelSlug != "" {
		pipe.Incr(ctx, fmt.Sprintf("gateway:active:model:%s", modelSlug))
	}
	if gatewayKeyID != "" {
		pipe.Incr(ctx, fmt.Sprintf("gateway:active:key:%s", gatewayKeyID))
	}
	_, err := pipe.Exec(ctx)
	return err
}

func (s *CooldownStore) DecrementActiveStream(ctx context.Context, modelSlug, gatewayKeyID string) error {
	pipe := s.rdb.Pipeline()
	pipe.Decr(ctx, "gateway:active:global")
	if modelSlug != "" {
		pipe.Decr(ctx, fmt.Sprintf("gateway:active:model:%s", modelSlug))
	}
	if gatewayKeyID != "" {
		pipe.Decr(ctx, fmt.Sprintf("gateway:active:key:%s", gatewayKeyID))
	}
	_, err := pipe.Exec(ctx)
	return err
}

func (s *CooldownStore) GetActiveStreams(ctx context.Context) (*ActiveStreamsSummary, error) {
	globalVal, _ := s.rdb.Get(ctx, "gateway:active:global").Int64()
	if globalVal < 0 {
		globalVal = 0
	}

	summary := &ActiveStreamsSummary{
		TotalActive: globalVal,
		ByModel:     make(map[string]int64),
		ByKey:       make(map[string]int64),
	}

	modelKeys, _ := s.rdb.Keys(ctx, "gateway:active:model:*").Result()
	for _, k := range modelKeys {
		val, err := s.rdb.Get(ctx, k).Int64()
		if err == nil && val > 0 {
			slug := strings.TrimPrefix(k, "gateway:active:model:")
			summary.ByModel[slug] = val
		}
	}

	gatewayKeys, _ := s.rdb.Keys(ctx, "gateway:active:key:*").Result()
	for _, k := range gatewayKeys {
		val, err := s.rdb.Get(ctx, k).Int64()
		if err == nil && val > 0 {
			keyID := strings.TrimPrefix(k, "gateway:active:key:")
			summary.ByKey[keyID] = val
		}
	}

	return summary, nil
}

