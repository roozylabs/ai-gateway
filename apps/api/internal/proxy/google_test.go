package proxy

import (
	"testing"
)

func TestSanitizeMessagesForGoogle(t *testing.T) {
	messages := []map[string]interface{}{
		{
			"role": "user",
			"content": "Read file page.tsx",
		},
		{
			"role": "assistant",
			"tool_calls": []interface{}{
				map[string]interface{}{
					"id": "call_123",
					"type": "function",
					"function": map[string]interface{}{
						"name": "default_api:read",
						"arguments": "{\"path\":\"page.tsx\"}",
					},
				},
			},
		},
		{
			"role": "assistant",
			"function_call": map[string]interface{}{
				"name": "default_api:read",
				"arguments": "{\"path\":\"talent.tsx\"}",
			},
		},
	}

	sanitized := SanitizeMessagesForGoogle(messages)
	if len(sanitized) != 3 {
		t.Fatalf("expected 3 messages, got %d", len(sanitized))
	}

	// Verify tool_calls has thought_signature
	tcRaw, ok := sanitized[1]["tool_calls"].([]interface{})
	if !ok || len(tcRaw) == 0 {
		t.Fatalf("expected tool_calls in message 1")
	}

	tcMap, ok := tcRaw[0].(map[string]interface{})
	if !ok {
		t.Fatalf("expected map in tool_calls")
	}

	if tcMap["thought_signature"] != "skip" {
		t.Errorf("expected tcMap thought_signature to be 'skip', got %v", tcMap["thought_signature"])
	}

	fnMap, ok := tcMap["function"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected function map")
	}

	if fnMap["thought_signature"] != "skip" {
		t.Errorf("expected fnMap thought_signature to be 'skip', got %v", fnMap["thought_signature"])
	}

	// Verify legacy function_call has thought_signature
	fnCallMap, ok := sanitized[2]["function_call"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected function_call map in message 2")
	}

	if fnCallMap["thought_signature"] != "skip" {
		t.Errorf("expected function_call thought_signature to be 'skip', got %v", fnCallMap["thought_signature"])
	}
}

func TestSanitizeMessagesForGoogle_AdvancedStructures(t *testing.T) {
	messages := []map[string]interface{}{
		{
			"role": "assistant",
			"functionCall": map[string]interface{}{
				"name": "default_api:skill",
				"arguments": "{\"name\":\"brainstorming\"}",
			},
		},
		{
			"role": "model",
			"parts": []interface{}{
				map[string]interface{}{
					"functionCall": map[string]interface{}{
						"name": "default_api:skill",
						"args": map[string]interface{}{"name": "systematic-debugging"},
					},
				},
			},
		},
		{
			"role": "assistant",
			"content": []interface{}{
				map[string]interface{}{
					"type": "tool_calls",
					"tool_calls": []interface{}{
						map[string]interface{}{
							"function": map[string]interface{}{
								"name": "default_api:skill",
							},
						},
					},
				},
			},
		},
	}

	sanitized := SanitizeMessagesForGoogle(messages)
	if len(sanitized) != 3 {
		t.Fatalf("expected 3 messages, got %d", len(sanitized))
	}

	// Message 0: camelCase functionCall
	msg0FnCall := sanitized[0]["functionCall"].(map[string]interface{})
	if msg0FnCall["thought_signature"] != "skip" || msg0FnCall["thoughtSignature"] != "skip" {
		t.Errorf("msg0 functionCall missing thought_signature/thoughtSignature: %v", msg0FnCall)
	}

	// Message 1: Gemini parts array
	parts := sanitized[1]["parts"].([]interface{})
	part0 := parts[0].(map[string]interface{})
	fnCall := part0["functionCall"].(map[string]interface{})
	if fnCall["thought_signature"] != "skip" || fnCall["thoughtSignature"] != "skip" {
		t.Errorf("part functionCall missing thought_signature: %v", fnCall)
	}

	// Message 2: Content blocks
	blocks := sanitized[2]["content"].([]interface{})
	block0 := blocks[0].(map[string]interface{})
	tcs := block0["tool_calls"].([]interface{})
	tc0 := tcs[0].(map[string]interface{})
	fn0 := tc0["function"].(map[string]interface{})
	if fn0["thought_signature"] != "skip" {
		t.Errorf("block tool_call function missing thought_signature: %v", fn0)
	}
}

func TestOpenAIAdapter_AlwaysSanitizesPrismAuto(t *testing.T) {
	adapter := NewOpenAIAdapter()
	req := &ProviderRequest{
		Model: "prism-auto",
		Messages: []map[string]interface{}{
			{
				"role": "assistant",
				"tool_calls": []interface{}{
					map[string]interface{}{
						"id":   "call_999",
						"type": "function",
						"function": map[string]interface{}{
							"name": "default_api:skill",
						},
					},
				},
			},
		},
	}

	httpReq, err := adapter.BuildRequest("https://opencode.ai/zen", "sk-test", req)
	if err != nil {
		t.Fatalf("BuildRequest failed: %v", err)
	}

	if httpReq == nil {
		t.Fatalf("httpReq is nil")
	}
}

