package redis

import (
	"context"
	"fmt"
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
