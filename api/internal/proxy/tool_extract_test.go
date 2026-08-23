package proxy

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExtractToolCallsFromResponse(t *testing.T) {
	t.Run("sync with tool_calls in choices", func(t *testing.T) {
		resp := &ProviderResponse{
			Choices: []Choice{
				{
					Index: 0,
					Message: map[string]interface{}{
						"role": "assistant",
						"tool_calls": []interface{}{
							map[string]interface{}{
								"id":   "call_abc123",
								"type": "function",
								"function": map[string]interface{}{
									"name":      "get_weather",
									"arguments": `{"city":"SF"}`,
								},
							},
							map[string]interface{}{
								"id":   "call_def456",
								"type": "function",
								"function": map[string]interface{}{
									"name":      "get_time",
									"arguments": "{}",
								},
							},
						},
					},
				},
				{
					Index: 1,
					Message: map[string]interface{}{
						"role":    "assistant",
						"content": "Hello!",
					},
				},
			},
		}
		recs := ExtractToolCallsFromResponse(resp)
		require.Len(t, recs, 2)
		assert.Equal(t, "get_weather", recs[0].Name)
		assert.Equal(t, "call_abc123", recs[0].CallID)
		assert.Equal(t, json.RawMessage(`{"city":"SF"}`), recs[0].Arguments)
		assert.Equal(t, "get_time", recs[1].Name)
		assert.Equal(t, "call_def456", recs[1].CallID)
		assert.Equal(t, json.RawMessage("{}"), recs[1].Arguments)
	})

	t.Run("nil response", func(t *testing.T) {
		assert.Nil(t, ExtractToolCallsFromResponse(nil))
	})

	t.Run("no tool_calls", func(t *testing.T) {
		resp := &ProviderResponse{
			Choices: []Choice{
				{Index: 0, Message: map[string]interface{}{"role": "assistant", "content": "hi"}},
			},
		}
		assert.Nil(t, ExtractToolCallsFromResponse(resp))
	})

	t.Run("malformed entries skipped", func(t *testing.T) {
		resp := &ProviderResponse{
			Choices: []Choice{
				{
					Index: 0,
					Message: map[string]interface{}{
						"tool_calls": []interface{}{
							"not-a-map",
							map[string]interface{}{"function": "not-a-map"},
							map[string]interface{}{
								"function": map[string]interface{}{
									"name": "", // empty name → skip
								},
							},
							map[string]interface{}{
								"id":   "call_ok",
								"type": "function",
								"function": map[string]interface{}{
									"name":      "do_thing",
									"arguments": `{"x":1}`,
								},
							},
						},
					},
				},
			},
		}
		recs := ExtractToolCallsFromResponse(resp)
		require.Len(t, recs, 1)
		assert.Equal(t, "do_thing", recs[0].Name)
		assert.Equal(t, "call_ok", recs[0].CallID)
		assert.Equal(t, json.RawMessage(`{"x":1}`), recs[0].Arguments)
	})

	t.Run("tool_call without arguments field", func(t *testing.T) {
		resp := &ProviderResponse{
			Choices: []Choice{
				{
					Index: 0,
					Message: map[string]interface{}{
						"tool_calls": []interface{}{
							map[string]interface{}{
								"id":   "call_noargs",
								"type": "function",
								"function": map[string]interface{}{
									"name": "no_args_func",
								},
							},
						},
					},
				},
			},
		}
		recs := ExtractToolCallsFromResponse(resp)
		require.Len(t, recs, 1)
		assert.Equal(t, "no_args_func", recs[0].Name)
		assert.Nil(t, recs[0].Arguments)
	})
}

func TestStreamToolAccumulator(t *testing.T) {
	t.Run("fragmented stream accumulation", func(t *testing.T) {
		acc := NewStreamToolAccumulator()
		acc.Observe(map[string]interface{}{
			"tool_calls": []interface{}{
				map[string]interface{}{
					"index": float64(0),
					"id":    "call_1",
					"function": map[string]interface{}{
						"name": "get_wea",
					},
				},
			},
		})
		acc.Observe(map[string]interface{}{
			"tool_calls": []interface{}{
				map[string]interface{}{
					"index": float64(0),
					"function": map[string]interface{}{
						"name":      "ther",
						"arguments": `{"city":`,
					},
				},
			},
		})
		acc.Observe(map[string]interface{}{
			"tool_calls": []interface{}{
				map[string]interface{}{
					"index": float64(0),
					"function": map[string]interface{}{
						"arguments": `"SF"}`,
					},
				},
			},
		})
		recs := acc.Finish()
		require.Len(t, recs, 1)
		assert.Equal(t, "get_weather", recs[0].Name)
		assert.Equal(t, "call_1", recs[0].CallID)
		assert.Equal(t, json.RawMessage(`{"city":"SF"}`), recs[0].Arguments)
	})

	t.Run("multiple interleaved indexes", func(t *testing.T) {
		acc := NewStreamToolAccumulator()
		acc.Observe(map[string]interface{}{
			"tool_calls": []interface{}{
				map[string]interface{}{
					"index": float64(0),
					"id":    "call_a",
					"function": map[string]interface{}{
						"name":      "alpha",
						"arguments": `{"a":`,
					},
				},
				map[string]interface{}{
					"index": float64(1),
					"id":    "call_b",
					"function": map[string]interface{}{
						"name":      "beta",
						"arguments": `{"b":`,
					},
				},
			},
		})
		acc.Observe(map[string]interface{}{
			"tool_calls": []interface{}{
				map[string]interface{}{
					"index": float64(0),
					"function": map[string]interface{}{
						"arguments": `1}`,
					},
				},
				map[string]interface{}{
					"index": float64(1),
					"function": map[string]interface{}{
						"arguments": `2}`,
					},
				},
			},
		})
		recs := acc.Finish()
		require.Len(t, recs, 2)
		// ordered by index
		assert.Equal(t, "alpha", recs[0].Name)
		assert.Equal(t, "call_a", recs[0].CallID)
		assert.Equal(t, json.RawMessage(`{"a":1}`), recs[0].Arguments)
		assert.Equal(t, "beta", recs[1].Name)
		assert.Equal(t, "call_b", recs[1].CallID)
		assert.Equal(t, json.RawMessage(`{"b":2}`), recs[1].Arguments)
	})

	t.Run("empty accumulator", func(t *testing.T) {
		acc := NewStreamToolAccumulator()
		recs := acc.Finish()
		assert.Len(t, recs, 0)
	})

	t.Run("delta without tool_calls", func(t *testing.T) {
		acc := NewStreamToolAccumulator()
		acc.Observe(map[string]interface{}{
			"content": "hello",
		})
		acc.Observe(map[string]interface{}{})
		acc.Observe(nil)
		recs := acc.Finish()
		assert.Len(t, recs, 0)
	})
}
