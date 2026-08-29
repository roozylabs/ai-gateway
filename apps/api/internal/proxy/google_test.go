package proxy

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
)

const sentinel = "skip_thought_signature_validator"

func TestSanitizeMessagesForGoogle(t *testing.T) {
	messages := []map[string]interface{}{
		{
			"role":    "user",
			"content": "Read file page.tsx",
		},
		{
			"role": "assistant",
			"tool_calls": []interface{}{
				map[string]interface{}{
					"id":   "call_123",
					"type": "function",
					"function": map[string]interface{}{
						"name":      "default_api:read",
						"arguments": "{\"path\":\"page.tsx\"}",
					},
				},
			},
		},
		{
			"role": "assistant",
			"function_call": map[string]interface{}{
				"name":      "default_api:read",
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

	if tcMap["thought_signature"] != sentinel {
		t.Errorf("expected tcMap thought_signature to be '%s', got %v", sentinel, tcMap["thought_signature"])
	}

	fnMap, ok := tcMap["function"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected function map")
	}

	if fnMap["thought_signature"] != sentinel {
		t.Errorf("expected fnMap thought_signature to be '%s', got %v", sentinel, fnMap["thought_signature"])
	}

	// Verify legacy function_call has thought_signature
	fnCallMap, ok := sanitized[2]["function_call"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected function_call map in message 2")
	}

	if fnCallMap["thought_signature"] != sentinel {
		t.Errorf("expected function_call thought_signature to be '%s', got %v", sentinel, fnCallMap["thought_signature"])
	}
}

func TestSanitizeMessagesForGoogle_AdvancedStructures(t *testing.T) {
	messages := []map[string]interface{}{
		{
			"role": "assistant",
			"functionCall": map[string]interface{}{
				"name":      "default_api:skill",
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
	if msg0FnCall["thought_signature"] != sentinel || msg0FnCall["thoughtSignature"] != sentinel {
		t.Errorf("msg0 functionCall missing thought_signature/thoughtSignature: %v", msg0FnCall)
	}

	// Message 1: Gemini parts array
	parts := sanitized[1]["parts"].([]interface{})
	part0 := parts[0].(map[string]interface{})
	fnCall := part0["functionCall"].(map[string]interface{})
	if fnCall["thought_signature"] != sentinel || fnCall["thoughtSignature"] != sentinel {
		t.Errorf("part functionCall missing thought_signature: %v", fnCall)
	}

	// Message 2: Content blocks
	blocks := sanitized[2]["content"].([]interface{})
	block0 := blocks[0].(map[string]interface{})
	tcs := block0["tool_calls"].([]interface{})
	tc0 := tcs[0].(map[string]interface{})
	fn0 := tc0["function"].(map[string]interface{})
	if fn0["thought_signature"] != sentinel {
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

func TestSanitizeMessagesForGoogle_Position8Bash(t *testing.T) {
	// Simulate history up to position 8
	messages := make([]map[string]interface{}, 9)
	for i := 0; i < 8; i++ {
		messages[i] = map[string]interface{}{
			"role":    "user",
			"content": fmt.Sprintf("Turn %d", i),
		}
	}
	messages[8] = map[string]interface{}{
		"role": "assistant",
		"tool_calls": []interface{}{
			map[string]interface{}{
				"id":   "call_bash_pos8",
				"type": "function",
				"function": map[string]interface{}{
					"name":      "default_api:bash",
					"arguments": "{\"command\":\"echo hello\"}",
				},
			},
		},
	}

	sanitized := SanitizeMessagesForGoogle(messages)
	if len(sanitized) != 9 {
		t.Fatalf("expected 9 messages, got %d", len(sanitized))
	}

	tcRaw, ok := sanitized[8]["tool_calls"].([]interface{})
	if !ok || len(tcRaw) == 0 {
		t.Fatalf("expected tool_calls at position 8")
	}

	tcMap := tcRaw[0].(map[string]interface{})
	if tcMap["thought_signature"] != sentinel || tcMap["thoughtSignature"] != sentinel {
		t.Errorf("tcMap missing thought_signature: %v", tcMap)
	}

	fnMap := tcMap["function"].(map[string]interface{})
	if fnMap["thought_signature"] != sentinel || fnMap["thoughtSignature"] != sentinel {
		t.Errorf("fnMap missing thought_signature: %v", fnMap)
	}
}

func TestSanitizeMessagesForGoogle_OverwritesOldSkipSentinel(t *testing.T) {
	messages := []map[string]interface{}{
		{
			"role": "assistant",
			"tool_calls": []interface{}{
				map[string]interface{}{
					"id":                "call_old_skip",
					"type":              "function",
					"thought_signature": "skip",
					"thoughtSignature":  "skip",
					"function": map[string]interface{}{
						"name":              "default_api:bash",
						"arguments":         "{}",
						"thought_signature": "skip",
						"thoughtSignature":  "skip",
					},
				},
			},
		},
	}

	sanitized := SanitizeMessagesForGoogle(messages)
	tcRaw := sanitized[0]["tool_calls"].([]interface{})
	tcMap := tcRaw[0].(map[string]interface{})
	if tcMap["thought_signature"] != sentinel || tcMap["thoughtSignature"] != sentinel {
		t.Errorf("expected old 'skip' to be replaced with sentinel, got %v", tcMap["thought_signature"])
	}

	fnMap := tcMap["function"].(map[string]interface{})
	if fnMap["thought_signature"] != sentinel || fnMap["thoughtSignature"] != sentinel {
		t.Errorf("expected old 'skip' in function to be replaced with sentinel, got %v", fnMap["thought_signature"])
	}
}

func TestSanitizeMessagesForGoogle_TypedMapPartsPosition6(t *testing.T) {
	messages := []map[string]interface{}{
		{
			"role": "model",
			"parts": []map[string]interface{}{
				{
					"functionCall": map[string]interface{}{
						"name": "default_api:glob",
						"args": map[string]interface{}{
							"pattern": ".agents/rules/*",
						},
					},
				},
			},
		},
	}

	sanitized := SanitizeMessagesForGoogle(messages)
	partsRaw, ok := sanitized[0]["parts"].([]interface{})
	if !ok || len(partsRaw) == 0 {
		t.Fatalf("expected parts array in sanitized message")
	}

	partMap := partsRaw[0].(map[string]interface{})
	if partMap["thought_signature"] != sentinel {
		t.Errorf("partMap missing thought_signature: %v", partMap)
	}

	fnCallMap := partMap["functionCall"].(map[string]interface{})
	if fnCallMap["thought_signature"] != sentinel {
		t.Errorf("fnCallMap missing thought_signature: %v", fnCallMap)
	}
}

func TestSanitizeMessagesForGoogle_Position165TodoWrite(t *testing.T) {
	messages := make([]map[string]interface{}, 166)
	for i := 0; i < 165; i++ {
		messages[i] = map[string]interface{}{
			"role":    "user",
			"content": fmt.Sprintf("Turn %d", i),
		}
	}
	messages[165] = map[string]interface{}{
		"role": "assistant",
		"parts": []map[string]interface{}{
			{
				"functionCall": map[string]interface{}{
					"name": "default_api:todowrite",
					"args": map[string]interface{}{
						"todos": []interface{}{
							map[string]interface{}{"content": "Task 1", "status": "pending"},
						},
					},
				},
			},
		},
	}

	sanitized := SanitizeMessagesForGoogle(messages)
	if len(sanitized) != 166 {
		t.Fatalf("expected 166 messages, got %d", len(sanitized))
	}

	pos165Parts, ok := sanitized[165]["parts"].([]interface{})
	if !ok || len(pos165Parts) == 0 {
		t.Fatalf("expected parts in message 165")
	}

	partMap := pos165Parts[0].(map[string]interface{})
	if partMap["thought_signature"] != sentinel || partMap["thoughtSignature"] != sentinel {
		t.Errorf("partMap missing thought_signature at position 165: %v", partMap)
	}

	fnCallMap := partMap["functionCall"].(map[string]interface{})
	if fnCallMap["thought_signature"] != sentinel || fnCallMap["thoughtSignature"] != sentinel {
		t.Errorf("fnCallMap missing thought_signature at position 165: %v", fnCallMap)
	}
}

func TestSanitizeMessagesForGoogle_Position109Grep(t *testing.T) {
	messages := make([]map[string]interface{}, 110)
	for i := 0; i < 109; i++ {
		messages[i] = map[string]interface{}{
			"role":    "user",
			"content": fmt.Sprintf("Turn %d", i),
		}
	}
	messages[109] = map[string]interface{}{
		"role": "assistant",
		"parts": []interface{}{
			map[string]interface{}{
				"functionCall": map[string]interface{}{
					"name": "default_api:grep",
					"args": map[string]interface{}{
						"Query":      "SanitizeMessagesForGoogle",
						"SearchPath": "c:\\me\\projects\\ai-gateway",
					},
				},
			},
		},
	}

	sanitized := SanitizeMessagesForGoogle(messages)
	if len(sanitized) != 110 {
		t.Fatalf("expected 110 messages, got %d", len(sanitized))
	}

	msg109 := sanitized[109]
	if msg109["thought_signature"] != sentinel || msg109["thoughtSignature"] != sentinel {
		t.Errorf("message 109 missing thought_signature: %v", msg109)
	}

	pos109Parts, ok := msg109["parts"].([]interface{})
	if !ok || len(pos109Parts) == 0 {
		t.Fatalf("expected parts in message 109")
	}

	partMap := pos109Parts[0].(map[string]interface{})
	if partMap["thought_signature"] != sentinel || partMap["thoughtSignature"] != sentinel {
		t.Errorf("partMap missing thought_signature at position 109: %v", partMap)
	}

	fnCallMap := partMap["functionCall"].(map[string]interface{})
	if fnCallMap["thought_signature"] != sentinel || fnCallMap["thoughtSignature"] != sentinel {
		t.Errorf("fnCallMap missing thought_signature at position 109: %v", fnCallMap)
	}

	argsMap := fnCallMap["args"].(map[string]interface{})
	if argsMap["thought_signature"] != sentinel || argsMap["thoughtSignature"] != sentinel {
		t.Errorf("argsMap missing thought_signature at position 109: %v", argsMap)
	}
}

func TestSanitizeMessagesForGoogle_Position34WriteJSONString(t *testing.T) {
	messages := make([]map[string]interface{}, 35)
	for i := 0; i < 34; i++ {
		messages[i] = map[string]interface{}{
			"role":    "user",
			"content": fmt.Sprintf("Turn %d", i),
		}
	}
	messages[34] = map[string]interface{}{
		"role": "assistant",
		"tool_calls": []interface{}{
			map[string]interface{}{
				"id":   "call_write_34",
				"type": "function",
				"function": map[string]interface{}{
					"name":      "default_api:write",
					"arguments": "{\"path\":\"c:\\\\me\\\\projects\\\\ai-gateway\\\\apps\\\\api\\\\internal\\\\proxy\\\\google.go\",\"CodeContent\":\"package proxy\"}",
				},
			},
		},
	}

	sanitized := SanitizeMessagesForGoogle(messages)
	if len(sanitized) != 35 {
		t.Fatalf("expected 35 messages, got %d", len(sanitized))
	}

	msg34 := sanitized[34]
	tcRaw, ok := msg34["tool_calls"].([]interface{})
	if !ok || len(tcRaw) == 0 {
		t.Fatalf("expected tool_calls at position 34")
	}

	tcMap := tcRaw[0].(map[string]interface{})
	fnMap := tcMap["function"].(map[string]interface{})
	argsStr, ok := fnMap["arguments"].(string)
	if !ok {
		t.Fatalf("expected string arguments in function")
	}

	if !strings.Contains(argsStr, sentinel) {
		t.Errorf("arguments JSON string missing sentinel thought_signature: %s", argsStr)
	}

	var parsedArgs map[string]interface{}
	if err := json.Unmarshal([]byte(argsStr), &parsedArgs); err != nil {
		t.Fatalf("failed to unmarshal arguments JSON string: %v", err)
	}

	if parsedArgs["thought_signature"] != sentinel || parsedArgs["thoughtSignature"] != sentinel {
		t.Errorf("parsedArgs missing thought_signature: %v", parsedArgs)
	}
}
