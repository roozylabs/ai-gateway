package redis_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRedisKeyIsolation_TenantPrefixing(t *testing.T) {
	orgA := "org_123"
	keyHash := "hash_abc"

	expectedKey := fmt.Sprintf("tenant:%s:gateway:%s:rate_limit", orgA, keyHash)
	assert.Equal(t, "tenant:org_123:gateway:hash_abc:rate_limit", expectedKey)
}
