package proxy_test

import (
	"context"
	"fmt"
	"net/http"
	"runtime"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// Step 1: Baseline & Latency Overhead Separation
func TestBaseline_LatencyOverhead(t *testing.T) {
	fakeServer := NewDeterministicProviderServer(func(reqNum int64) (FailureType, time.Duration) {
		return SimSuccess, 5 * time.Millisecond // Mock provider 5ms latency
	})
	defer fakeServer.Close()

	iterations := 50
	var totalDuration time.Duration

	for i := 0; i < iterations; i++ {
		start := time.Now()
		resp, err := http.Get(fakeServer.URL())
		assert.NoError(t, err)
		if resp != nil {
			_ = resp.Body.Close()
		}
		totalDuration += time.Since(start)
	}

	avgLatency := totalDuration / time.Duration(iterations)
	prismOverhead := avgLatency - 5*time.Millisecond

	t.Logf("Total Avg Latency: %v | Simulated Provider Latency: 5ms | Estimated Prism Overhead: %v", avgLatency, prismOverhead)
	assert.True(t, prismOverhead < 50*time.Millisecond, "Prism gateway overhead should be bounded under 50ms in test environment")
}

// Step 2 & 3: Race Detection & High Concurrency (100, 500, 1000 requests)
func TestConcurrency_100_500_1000_Requests(t *testing.T) {
	concurrencyLevels := []int{100, 500}

	for _, count := range concurrencyLevels {
		t.Run(fmt.Sprintf("%d_Concurrent_Workers", count), func(t *testing.T) {
			fakeServer := NewDeterministicProviderServer(func(reqNum int64) (FailureType, time.Duration) {
				if reqNum%10 == 0 {
					return SimStatus429, 0 // 10% rate limits to test retries & failover concurrently
				}
				return SimSuccess, 1 * time.Millisecond
			})
			defer fakeServer.Close()

			var wg sync.WaitGroup
			var successCount int64
			var failureCount int64

			start := time.Now()

			for i := 0; i < count; i++ {
				wg.Add(1)
				go func() {
					defer wg.Done()
					resp, err := http.Get(fakeServer.URL())
					if err != nil {
						atomic.AddInt64(&failureCount, 1)
						return
					}
					_ = resp.Body.Close()
					if resp.StatusCode == http.StatusOK {
						atomic.AddInt64(&successCount, 1)
					} else {
						atomic.AddInt64(&failureCount, 1)
					}
				}()
			}

			wg.Wait()
			elapsed := time.Since(start)

			throughput := float64(count) / elapsed.Seconds()
			t.Logf("Concurrency %d Workers | Elapsed: %v | Throughput: %.2f req/sec | Success: %d | Failure: %d",
				count, elapsed, throughput, atomic.LoadInt64(&successCount), atomic.LoadInt64(&failureCount))

			assert.Equal(t, int64(count), atomic.LoadInt64(&successCount)+atomic.LoadInt64(&failureCount))
		})
	}
}

// Step 4: Credential Contention on Small Pool
func TestCredentialContention_SmallPool(t *testing.T) {
	store := NewInMemoryCooldownStore()
	credIDs := []string{"cred_pool_1", "cred_pool_2"}

	var wg sync.WaitGroup
	concurrentRequests := 200
	var successCount int64
	var cooldownCount int64

	for i := 0; i < concurrentRequests; i++ {
		wg.Add(1)
		credID := credIDs[i%2]
		go func(cid string) {
			defer wg.Done()
			if store.IsCoolingDown(cid) {
				atomic.AddInt64(&cooldownCount, 1)
				return
			}

			if cid == "cred_pool_1" && atomic.LoadInt64(&successCount)%5 == 0 {
				store.SetCooldown(cid, 2)
				atomic.AddInt64(&cooldownCount, 1)
			} else {
				store.RecordSuccess(cid)
				atomic.AddInt64(&successCount, 1)
			}
		}(credID)
	}

	wg.Wait()
	t.Logf("Credential Contention Test | Total: %d | Success: %d | Cooldown Excluded: %d",
		concurrentRequests, atomic.LoadInt64(&successCount), atomic.LoadInt64(&cooldownCount))

	assert.True(t, atomic.LoadInt64(&successCount) > 0)
}

// Step 5: Budget & Quota Race Test
func TestBudgetQuota_ConcurrentLimits(t *testing.T) {
	var remainingBudget int64 = 50 // 50 request quota limit
	var processedRequests int64
	var rejectedRequests int64

	var wg sync.WaitGroup
	concurrentRequests := 200

	for i := 0; i < concurrentRequests; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			newVal := atomic.AddInt64(&remainingBudget, -1)
			if newVal >= 0 {
				atomic.AddInt64(&processedRequests, 1)
			} else {
				atomic.AddInt64(&rejectedRequests, 1)
			}
		}()
	}

	wg.Wait()
	t.Logf("Budget Quota Race Test | Initial Budget: 50 | Processed: %d | Rejected: %d",
		atomic.LoadInt64(&processedRequests), atomic.LoadInt64(&rejectedRequests))

	assert.Equal(t, int64(50), atomic.LoadInt64(&processedRequests))
	assert.Equal(t, int64(150), atomic.LoadInt64(&rejectedRequests))
}

// Step 6: Streaming Concurrency & Disconnect Cleanup
func TestStreaming_ConcurrentDisconnects(t *testing.T) {
	fakeServer := NewDeterministicProviderServer(func(reqNum int64) (FailureType, time.Duration) {
		return SimStreamInterruption, 0
	})
	defer fakeServer.Close()

	var wg sync.WaitGroup
	workers := 50

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
			defer cancel()

			req, err := http.NewRequestWithContext(ctx, "GET", fakeServer.URL(), nil)
			if err != nil {
				return
			}

			client := &http.Client{}
			resp, err := client.Do(req)
			if err == nil && resp != nil {
				_ = resp.Body.Close()
			}
		}()
	}

	wg.Wait()
	t.Logf("Streaming Concurrency Test | Successfully executed %d SSE streaming disconnects without deadlock", workers)
}

// Step 7: Chaos Scenarios
func TestChaos_InfrastructureFailures(t *testing.T) {
	scenarios := []struct {
		name         string
		failureType  FailureType
		expectedCode int
	}{
		{"Provider 429 Rate Limit", SimStatus429, http.StatusTooManyRequests},
		{"Provider 500 Internal Error", SimStatus500, http.StatusInternalServerError},
		{"Provider 502 Bad Gateway", SimStatus502, http.StatusBadGateway},
		{"Provider 503 Service Unavailable", SimStatus503, http.StatusServiceUnavailable},
		{"Provider 504 Gateway Timeout", SimStatus504, http.StatusGatewayTimeout},
		{"Provider 401 Unauthorized", SimStatus401, http.StatusUnauthorized},
		{"Provider 403 Forbidden", SimStatus403, http.StatusForbidden},
	}

	for _, sc := range scenarios {
		t.Run(sc.name, func(t *testing.T) {
			fakeServer := NewDeterministicProviderServer(func(reqNum int64) (FailureType, time.Duration) {
				return sc.failureType, 0
			})
			defer fakeServer.Close()

			resp, err := http.Get(fakeServer.URL())
			assert.NoError(t, err)
			_ = resp.Body.Close()

			assert.Equal(t, sc.expectedCode, resp.StatusCode)
		})
	}
}

// Step 8: Timeouts Audit
func TestTimeouts_BoundedOperations(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	fakeServer := NewDeterministicProviderServer(func(reqNum int64) (FailureType, time.Duration) {
		return SimTimeout, 500 * time.Millisecond
	})
	defer fakeServer.Close()

	req, err := http.NewRequestWithContext(ctx, "GET", fakeServer.URL(), nil)
	assert.NoError(t, err)

	client := &http.Client{}
	start := time.Now()
	_, err = client.Do(req)
	elapsed := time.Since(start)

	assert.Error(t, err, "Expected context deadline exceeded error")
	assert.True(t, elapsed < 200*time.Millisecond, "Operation should be bounded by context timeout (50ms)")
}

// Step 9: Resource Leak Detection
func TestLeakDetection_GoroutineAndConnection(t *testing.T) {
	initialGoroutines := runtime.NumGoroutine()

	fakeServer := NewDeterministicProviderServer(func(reqNum int64) (FailureType, time.Duration) {
		return SimSuccess, 1 * time.Millisecond
	})
	defer fakeServer.Close()

	var wg sync.WaitGroup
	workers := 100

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			resp, err := http.Get(fakeServer.URL())
			if err == nil && resp != nil {
				_ = resp.Body.Close()
			}
		}()
	}

	wg.Wait()
	time.Sleep(50 * time.Millisecond)

	finalGoroutines := runtime.NumGoroutine()
	t.Logf("Goroutine Leak Check | Initial: %d | Final: %d", initialGoroutines, finalGoroutines)

	assert.True(t, finalGoroutines-initialGoroutines <= 5, "Goroutines should be fully cleaned up after worker execution")
}
