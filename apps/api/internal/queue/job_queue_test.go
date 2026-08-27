package queue

import (
	"testing"
	"time"

	"github.com/roozylabs/prism/internal/proxy"
	"github.com/stretchr/testify/assert"
)

func TestAsyncJob_StatusConstants(t *testing.T) {
	assert.Equal(t, JobStatus("queued"), StatusQueued)
	assert.Equal(t, JobStatus("processing"), StatusProcessing)
	assert.Equal(t, JobStatus("completed"), StatusCompleted)
	assert.Equal(t, JobStatus("failed"), StatusFailed)
}

func TestAsyncJob_StructSerialization(t *testing.T) {
	job := &AsyncJob{
		JobID:     "job_123",
		RequestID: "req_123",
		Status:    StatusQueued,
		Model:     "gemini-3.6-flash",
		RequestPayload: &proxy.ProxyRequest{
			Model: "gemini-3.6-flash",
		},
		CreatedAt: time.Now(),
	}

	assert.Equal(t, "job_123", job.JobID)
	assert.Equal(t, StatusQueued, job.Status)
}
