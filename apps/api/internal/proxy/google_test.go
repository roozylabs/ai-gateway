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
