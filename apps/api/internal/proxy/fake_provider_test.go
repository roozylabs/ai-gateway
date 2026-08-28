package proxy_test

import (
	"net"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

type FailureType string

const (
	SimSuccess            FailureType = "SUCCESS"
	SimStatus401          FailureType = "401"
	SimStatus403          FailureType = "403"
	SimStatus408          FailureType = "408"
	SimStatus429          FailureType = "429"
	SimStatus500          FailureType = "500"
	SimStatus502          FailureType = "502"
	SimStatus503          FailureType = "503"
	SimStatus504          FailureType = "504"
	SimTimeout            FailureType = "TIMEOUT"
	SimConnectionReset    FailureType = "CONNECTION_RESET"
	SimMalformedResponse  FailureType = "MALFORMED_RESPONSE"
	SimStreamInterruption FailureType = "STREAM_INTERRUPTION"
	SimPartialResponse    FailureType = "PARTIAL_RESPONSE"
)

type DeterministicProviderServer struct {
	server       *httptest.Server
	requestCount int64
	behavior     func(reqNum int64) (FailureType, time.Duration)
}

func NewDeterministicProviderServer(behavior func(reqNum int64) (FailureType, time.Duration)) *DeterministicProviderServer {
	s := &DeterministicProviderServer{
		behavior: behavior,
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqNum := atomic.AddInt64(&s.requestCount, 1)
		failType, delay := s.behavior(reqNum)

		if delay > 0 {
			time.Sleep(delay)
		}

		switch failType {
		case SimSuccess:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{
				"id": "chatcmpl-test-success",
				"object": "chat.completion",
				"created": 1700000000,
				"model": "gpt-4o",
				"choices": [{
					"index": 0,
					"message": {
						"role": "assistant",
						"content": "Hello from deterministic fake provider!"
					},
					"finish_reason": "stop"
				}],
				"usage": {
					"prompt_tokens": 15,
					"completion_tokens": 10,
					"total_tokens": 25
				}
			}`))

		case SimStatus401:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error": {"message": "Invalid API key provided", "type": "invalid_request_error", "code": "invalid_api_key"}}`))

		case SimStatus403:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			_, _ = w.Write([]byte(`{"error": {"message": "Access denied for workspace", "type": "auth_error", "code": "forbidden"}}`))

		case SimStatus408:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusRequestTimeout)
			_, _ = w.Write([]byte(`{"error": {"message": "Upstream request timed out"}}`))

		case SimStatus429:
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "1")
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"error": {"message": "Rate limit exceeded. Please retry after 1s", "type": "requests", "code": "rate_limit_exceeded"}}`))

		case SimStatus500:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"error": {"message": "Internal server error at upstream provider"}}`))

		case SimStatus502:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			_, _ = w.Write([]byte(`{"error": {"message": "Bad gateway connecting to inference node"}}`))

		case SimStatus503:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"error": {"message": "Service temporarily unavailable"}}`))

		case SimStatus504:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusGatewayTimeout)
			_, _ = w.Write([]byte(`{"error": {"message": "Gateway timeout connecting to upstream model backend"}}`))

		case SimTimeout:
			time.Sleep(3 * time.Second)
			w.WriteHeader(http.StatusOK)

		case SimConnectionReset:
			hj, ok := w.(http.Hijacker)
			if ok {
				conn, _, err := hj.Hijack()
				if err == nil {
					_ = conn.(*net.TCPConn).SetLinger(0)
					_ = conn.Close()
					return
				}
			}
			w.WriteHeader(http.StatusInternalServerError)

		case SimMalformedResponse:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{this is invalid json format raw output`))

		case SimPartialResponse:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"id": "chatcmpl-partial", "choices": [{"message": {"role": "assistant", "content": "hello"`))

		case SimStreamInterruption:
			w.Header().Set("Content-Type", "text/event-stream")
			w.WriteHeader(http.StatusOK)
			flusher, ok := w.(http.Flusher)
			_, _ = w.Write([]byte("data: {\"choices\":[{\"delta\":{\"content\":\"Hello \"}}]}\n\n"))
			if ok {
				flusher.Flush()
			}
			time.Sleep(20 * time.Millisecond)
			_, _ = w.Write([]byte("data: {\"choices\":[{\"delta\":{\"content\":\"world\"}}]}\n\n"))
			if ok {
				flusher.Flush()
			}
			hj, ok := w.(http.Hijacker)
			if ok {
				conn, _, err := hj.Hijack()
				if err == nil {
					_ = conn.(*net.TCPConn).SetLinger(0)
					_ = conn.Close()
					return
				}
			}

		default:
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"status":"ok"}`))
		}
	})

	s.server = httptest.NewServer(handler)
	return s
}

func (s *DeterministicProviderServer) URL() string {
	return s.server.URL
}

func (s *DeterministicProviderServer) RequestCount() int64 {
	return atomic.LoadInt64(&s.requestCount)
}

func (s *DeterministicProviderServer) Close() {
	s.server.Close()
}

func TestFakeProviderServer_BasicFunctionality(t *testing.T) {
	fakeServer := NewDeterministicProviderServer(func(reqNum int64) (FailureType, time.Duration) {
		if reqNum == 1 {
			return SimStatus429, 0
		}
		return SimSuccess, 0
	})
	defer fakeServer.Close()

	resp1, err := http.Get(fakeServer.URL())
	if err != nil {
		t.Fatalf("first request failed: %v", err)
	}
	_ = resp1.Body.Close()
	if resp1.StatusCode != http.StatusTooManyRequests {
		t.Errorf("expected 429, got %d", resp1.StatusCode)
	}

	resp2, err := http.Get(fakeServer.URL())
	if err != nil {
		t.Fatalf("second request failed: %v", err)
	}
	_ = resp2.Body.Close()
	if resp2.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp2.StatusCode)
	}

	if fakeServer.RequestCount() != 2 {
		t.Errorf("expected 2 requests, got %d", fakeServer.RequestCount())
	}
}
