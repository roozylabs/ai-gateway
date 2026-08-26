package redis

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAgentLimiter_NilSafe(t *testing.T) {
	limiter := NewAgentLimiter(nil)
	ctx := context.Background()

	val, err := limiter.IncrementSpend(ctx, "agent-1", 100)
	assert.NoError(t, err)
	assert.Equal(t, int64(0), val)

	exceeded, err := limiter.IsBudgetExceeded(ctx, "agent-1", 500)
	assert.NoError(t, err)
	assert.False(t, exceeded)

	allowed, err := limiter.CheckRateLimit(ctx, "agent-1", 60)
	assert.NoError(t, err)
	assert.True(t, allowed)
}

func TestAgentLimiter_EmptyAgentID(t *testing.T) {
	limiter := NewAgentLimiter(nil)
	ctx := context.Background()

	exceeded, err := limiter.IsBudgetExceeded(ctx, "", 100)
	assert.NoError(t, err)
	assert.False(t, exceeded)

	allowed, err := limiter.CheckRateLimit(ctx, "", 10)
	assert.NoError(t, err)
	assert.True(t, allowed)
}
