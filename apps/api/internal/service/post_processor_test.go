package service

import (
	"context"
	"testing"
	"time"

	"github.com/roozylabs/prism/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestAsyncPostProcessor_EnqueueAndProcess(t *testing.T) {
	processor := NewAsyncPostProcessor(nil, nil, nil, nil, 100, 2)
	defer processor.Stop()

	task := &PostProcessTask{
		Ctx:       context.Background(),
		RequestID: "req_test_123",
		Log: &models.RequestLog{
			ID:        "log_123",
			Model:     "gemini-3.6-flash",
			CostUSD:   0.001,
			CreatedAt: time.Now(),
		},
		GatewayKey: &models.GatewayAPIKey{
			ID: "key_123",
		},
	}

	enqueued := processor.Enqueue(task)
	assert.True(t, enqueued)
}

func TestAsyncPostProcessor_NilTaskHandling(t *testing.T) {
	processor := NewAsyncPostProcessor(nil, nil, nil, nil, 10, 1)
	defer processor.Stop()

	assert.False(t, processor.Enqueue(nil))
	assert.False(t, processor.Enqueue(&PostProcessTask{}))
}
