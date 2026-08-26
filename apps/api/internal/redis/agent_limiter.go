package redis

import (
	"context"
	"errors"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

type AgentLimiter struct {
	rdb *goredis.Client
}

func NewAgentLimiter(rdb *goredis.Client) *AgentLimiter {
	return &AgentLimiter{rdb: rdb}
}

// IncrementSpend adds cost in cents to the agent's monthly budget key.
func (a *AgentLimiter) IncrementSpend(ctx context.Context, agentID string, cents int) (int64, error) {
	if a.rdb == nil || agentID == "" {
		return 0, nil
	}
	monthKey := fmt.Sprintf("agent:%s:spend:%s", agentID, time.Now().Format("2006-01"))
	val, err := a.rdb.IncrBy(ctx, monthKey, int64(cents)).Result()
	if err != nil {
		return 0, err
	}
	// Expire monthly key after 60 days
	_ = a.rdb.Expire(ctx, monthKey, 60*24*time.Hour).Err()
	return val, nil
}

// IsBudgetExceeded checks if current monthly spend exceeds maxBudgetCents.
func (a *AgentLimiter) IsBudgetExceeded(ctx context.Context, agentID string, maxBudgetCents int) (bool, error) {
	if a.rdb == nil || maxBudgetCents <= 0 || agentID == "" {
		return false, nil
	}
	monthKey := fmt.Sprintf("agent:%s:spend:%s", agentID, time.Now().Format("2006-01"))
	val, err := a.rdb.Get(ctx, monthKey).Int64()
	if errors.Is(err, goredis.Nil) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return val >= int64(maxBudgetCents), nil
}

// CheckRateLimit checks sliding window request count per minute.
func (a *AgentLimiter) CheckRateLimit(ctx context.Context, agentID string, maxRPM int) (bool, error) {
	if a.rdb == nil || maxRPM <= 0 || agentID == "" {
		return true, nil
	}
	minuteKey := fmt.Sprintf("agent:%s:rpm:%s", agentID, time.Now().Format("2006-01-02-15-04"))
	count, err := a.rdb.Incr(ctx, minuteKey).Result()
	if err != nil {
		return true, err
	}
	if count == 1 {
		_ = a.rdb.Expire(ctx, minuteKey, 2*time.Minute).Err()
	}
	return count <= int64(maxRPM), nil
}
