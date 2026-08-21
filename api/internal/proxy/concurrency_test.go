package proxy

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestProviderConcurrencyLimiter(t *testing.T) {
	limiter := NewProviderConcurrencyLimiter()
	limiter.SetLimit("test_prov", 2)

	var active int32
	var maxObserved int32
	var wg sync.WaitGroup

	for i := 0; i < 6; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()

			release, err := limiter.Acquire(ctx, "test_prov")
			if err != nil {
				t.Errorf("acquire failed: %v", err)
				return
			}

			curr := atomic.AddInt32(&active, 1)
			for {
				prevMax := atomic.LoadInt32(&maxObserved)
				if curr <= prevMax || atomic.CompareAndSwapInt32(&maxObserved, prevMax, curr) {
					break
				}
			}

			time.Sleep(50 * time.Millisecond)
			atomic.AddInt32(&active, -1)
			release()
		}()
	}

	wg.Wait()

	if maxObserved > 2 {
		t.Errorf("expected max concurrency <= 2, got %d", maxObserved)
	}
}
