package proxy

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
)

func TestSanitizeMessagesForGoogle(t *testing.T) {
	sentinel := SentinelThoughtSignature

	messages := []map[string]interface{}{
		{
			"role":    "assistant",
			"content": "I will run a tool.",
			"tool_calls": []interface{}{
				map[string]interface{}{
					"id":   "call_1",
					"type": "function",
					"function": map[string]interface{}{
						"name":      "get_weather",
						"arguments": `{"location":"Jakarta"}`,
					},
				},
			},
		},
		{
			"role": "assistant",
			"parts": []interface{}{
				map[string]interface{}{
					"functionCall": map[string]interface{}{
						"name": "get_weather",
						"args": map[string]interface{}{"location": "Jakarta"},
					},
				},
			},
		},
	}

	sanitized := SanitizeMessagesForGoogle(messages)

	// Message 0 check
	msg0 := sanitized[0]
	if msg0["thought_signature"] != sentinel || msg0["thoughtSignature"] != sentinel {
		t.Errorf("msg0 missing thought_signature/thoughtSignature: %v", msg0)
	}
	tcRaw0 := msg0["tool_calls"].([]interface{})
	tcMap0 := tcRaw0[0].(map[string]interface{})
	if tcMap0["thought_signature"] != sentinel || tcMap0["thoughtSignature"] != sentinel {
		t.Errorf("tcMap0 missing thought_signature/thoughtSignature: %v", tcMap0)
	}
	fnMap0 := tcMap0["function"].(map[string]interface{})
	if fnMap0["thought_signature"] != sentinel || fnMap0["thoughtSignature"] != sentinel {
		t.Errorf("fnMap0 missing thought_signature/thoughtSignature: %v", fnMap0)
	}

	// Crucial: arguments string MUST NOT contain thought_signature pollution
	argsStr0 := fnMap0["arguments"].(string)
	if strings.Contains(argsStr0, sentinel) {
		t.Errorf("arguments string should NOT contain thought_signature pollution: %s", argsStr0)
	}

	// Message 1 check
	msg1 := sanitized[1]
	if msg1["thought_signature"] != sentinel || msg1["thoughtSignature"] != sentinel {
		t.Errorf("msg1 missing thought_signature/thoughtSignature: %v", msg1)
	}
	parts1 := msg1["parts"].([]interface{})
	partMap1 := parts1[0].(map[string]interface{})
	if partMap1["thought_signature"] != sentinel || partMap1["thoughtSignature"] != sentinel {
		t.Errorf("partMap1 missing thought_signature/thoughtSignature: %v", partMap1)
	}
	fnCallMap1 := partMap1["functionCall"].(map[string]interface{})
	if fnCallMap1["thought_signature"] != sentinel || fnCallMap1["thoughtSignature"] != sentinel {
		t.Errorf("fnCallMap1 missing thought_signature/thoughtSignature: %v", fnCallMap1)
	}

	// Crucial: args map MUST NOT contain thought_signature pollution
	argsMap1 := fnCallMap1["args"].(map[string]interface{})
	if _, hasSig := argsMap1["thought_signature"]; hasSig {
		t.Errorf("argsMap1 should NOT contain thought_signature pollution: %v", argsMap1)
	}
}

func TestSanitizeMessagesForGoogle_AdvancedStructures(t *testing.T) {
	sentinel := SentinelThoughtSignature

	messages := []map[string]interface{}{
		{
			"role": "model",
			"parts": []interface{}{
				map[string]interface{}{
					"functionResponse": map[string]interface{}{
						"name": "get_weather",
						"response": map[string]interface{}{
							"name":    "get_weather",
							"content": map[string]interface{}{"temp": "30C"},
						},
					},
				},
			},
		},
	}

	sanitized := SanitizeMessagesForGoogle(messages)
	msg := sanitized[0]

	if msg["thought_signature"] != sentinel {
		t.Errorf("msg missing thought_signature: %v", msg)
	}

	parts := msg["parts"].([]interface{})
	partMap := parts[0].(map[string]interface{})
	if partMap["thought_signature"] != sentinel {
		t.Errorf("partMap missing thought_signature: %v", partMap)
	}

	fnRespMap := partMap["functionResponse"].(map[string]interface{})
	if fnRespMap["thought_signature"] != sentinel {
		t.Errorf("fnRespMap missing thought_signature: %v", fnRespMap)
	}
}

func TestSanitizeMessagesForGoogle_Position8Bash(t *testing.T) {
	sentinel := SentinelThoughtSignature

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
				"id":   "call_bash_8",
				"type": "function",
				"function": map[string]interface{}{
					"name":      "bash",
					"arguments": `{"command":"ls -la"}`,
				},
			},
		},
	}

	sanitized := SanitizeMessagesForGoogle(messages)
	if len(sanitized) != 9 {
		t.Fatalf("expected 9 messages, got %d", len(sanitized))
	}

	msg8 := sanitized[8]
	if msg8["thought_signature"] != sentinel || msg8["thoughtSignature"] != sentinel {
		t.Errorf("message 8 missing thought_signature: %v", msg8)
	}

	tcRaw, ok := msg8["tool_calls"].([]interface{})
	if !ok || len(tcRaw) == 0 {
		t.Fatalf("expected tool_calls at position 8")
	}

	tcMap := tcRaw[0].(map[string]interface{})
	if tcMap["thought_signature"] != sentinel || tcMap["thoughtSignature"] != sentinel {
		t.Errorf("tcMap at position 8 missing thought_signature: %v", tcMap)
	}

	fnMap := tcMap["function"].(map[string]interface{})
	if fnMap["thought_signature"] != sentinel || fnMap["thoughtSignature"] != sentinel {
		t.Errorf("fnMap at position 8 missing thought_signature: %v", fnMap)
	}
}

func TestSanitizeMessagesForGoogle_Position165TodoWrite(t *testing.T) {
	sentinel := SentinelThoughtSignature

	messages := make([]map[string]interface{}, 166)
	for i := 0; i < 165; i++ {
		messages[i] = map[string]interface{}{
			"role":    "user",
			"content": fmt.Sprintf("Turn %d", i),
		}
	}
	messages[165] = map[string]interface{}{
		"role": "assistant",
		"parts": []interface{}{
			map[string]interface{}{
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
	pos165Parts := sanitized[165]["parts"].([]interface{})
	partMap := pos165Parts[0].(map[string]interface{})
	if partMap["thought_signature"] != sentinel || partMap["thoughtSignature"] != sentinel {
		t.Errorf("partMap missing thought_signature at position 165: %v", partMap)
	}

	fnCallMap := partMap["functionCall"].(map[string]interface{})
	if fnCallMap["thought_signature"] != sentinel || fnCallMap["thoughtSignature"] != sentinel {
		t.Errorf("fnCallMap missing thought_signature at position 165: %v", fnCallMap)
	}

	argsMap := fnCallMap["args"].(map[string]interface{})
	if _, hasSig := argsMap["thought_signature"]; hasSig {
		t.Errorf("argsMap should NOT contain thought_signature pollution: %v", argsMap)
	}

	todosSlice := argsMap["todos"].([]interface{})
	todoItem := todosSlice[0].(map[string]interface{})
	if _, hasSig := todoItem["thought_signature"]; hasSig {
		t.Errorf("todoItem should NOT contain thought_signature pollution: %v", todoItem)
	}
}

func TestSanitizeMessagesForGoogle_EditTool(t *testing.T) {
	sentinel := SentinelThoughtSignature

	messages := []map[string]interface{}{
		{
			"role": "assistant",
			"tool_calls": []interface{}{
				map[string]interface{}{
					"id":   "call_edit_1",
					"type": "function",
					"function": map[string]interface{}{
						"name":      "edit",
						"arguments": `{"filePath":"C:\\me\\projects\\DataTable.tsx","oldString":"foo","newString":"bar"}`,
					},
				},
			},
		},
	}

	sanitized := SanitizeMessagesForGoogle(messages)
	msg := sanitized[0]

	tcRaw := msg["tool_calls"].([]interface{})
	tcMap := tcRaw[0].(map[string]interface{})
	fnMap := tcMap["function"].(map[string]interface{})

	if fnMap["thought_signature"] != sentinel {
		t.Errorf("fnMap missing thought_signature: %v", fnMap)
	}

	argsStr := fnMap["arguments"].(string)
	if strings.Contains(argsStr, sentinel) {
		t.Errorf("edit tool arguments JSON string MUST NOT contain thought_signature pollution: %s", argsStr)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(argsStr), &parsed); err != nil {
		t.Fatalf("edit tool arguments should remain valid unpolluted JSON: %v", err)
	}

	if _, hasSig := parsed["thoughtSignature"]; hasSig {
		t.Errorf("parsed edit arguments contains unexpected thoughtSignature: %v", parsed)
	}
}
