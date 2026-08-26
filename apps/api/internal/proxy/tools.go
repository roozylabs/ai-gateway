package proxy

import (
	"encoding/json"
	"fmt"
)

type FunctionSpec struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	Parameters  map[string]interface{} `json:"parameters,omitempty"`
}

type UnifiedTool struct {
	Type     string       `json:"type"` // "function"
	Function FunctionSpec `json:"function"`
}

type ToolCallSpec struct {
	ID       string       `json:"id"`
	Type     string       `json:"type"` // "function"
	Function FunctionCall `json:"function"`
}

type FunctionCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

// ConvertGenericToolsToOpenAI converts raw tools into standard OpenAI format
func ConvertGenericToolsToOpenAI(rawTools []interface{}) []map[string]interface{} {
	var result []map[string]interface{}
	for _, item := range rawTools {
		toolMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		// Check if already in OpenAI format { type: "function", function: { ... } }
		if t, hasType := toolMap["type"].(string); hasType && t == "function" {
			result = append(result, toolMap)
			continue
		}

		// Check if in Anthropic format { name: "...", description: "...", input_schema: { ... } }
		if name, hasName := toolMap["name"].(string); hasName {
			desc, _ := toolMap["description"].(string)
			params, _ := toolMap["input_schema"].(map[string]interface{})
			if params == nil {
				params, _ = toolMap["parameters"].(map[string]interface{})
			}
			result = append(result, map[string]interface{}{
				"type": "function",
				"function": map[string]interface{}{
					"name":        name,
					"description": desc,
					"parameters":  params,
				},
			})
		}
	}
	return result
}

// ConvertOpenAIToolsToAnthropic converts OpenAI tools to Anthropic format
func ConvertOpenAIToolsToAnthropic(openAiTools []map[string]interface{}) []map[string]interface{} {
	var result []map[string]interface{}
	for _, tool := range openAiTools {
		fn, ok := tool["function"].(map[string]interface{})
		if !ok {
			continue
		}
		name, _ := fn["name"].(string)
		desc, _ := fn["description"].(string)
		params, _ := fn["parameters"].(map[string]interface{})
		if params == nil {
			params = map[string]interface{}{"type": "object", "properties": map[string]interface{}{}}
		}

		result = append(result, map[string]interface{}{
			"name":         name,
			"description":  desc,
			"input_schema": params,
		})
	}
	return result
}

// ConvertOpenAIToolsToGoogle converts OpenAI tools to Google Gemini function_declarations format
func ConvertOpenAIToolsToGoogle(openAiTools []map[string]interface{}) map[string]interface{} {
	var declarations []map[string]interface{}
	for _, tool := range openAiTools {
		fn, ok := tool["function"].(map[string]interface{})
		if !ok {
			continue
		}
		name, _ := fn["name"].(string)
		desc, _ := fn["description"].(string)
		params, _ := fn["parameters"].(map[string]interface{})

		declarations = append(declarations, map[string]interface{}{
			"name":        name,
			"description": desc,
			"parameters":  params,
		})
	}
	return map[string]interface{}{
		"function_declarations": declarations,
	}
}

// NormalizeAnthropicToolUse converts Anthropic tool_use content blocks to OpenAI tool_calls
func NormalizeAnthropicToolUse(contentBlocks []interface{}) []map[string]interface{} {
	var toolCalls []map[string]interface{}
	for idx, item := range contentBlocks {
		block, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		blockType, _ := block["type"].(string)
		if blockType == "tool_use" {
			id, _ := block["id"].(string)
			if id == "" {
				id = fmt.Sprintf("call_anthropic_%d", idx)
			}
			name, _ := block["name"].(string)
			inputObj := block["input"]
			argsStr := "{}"
			if inputObj != nil {
				if b, err := json.Marshal(inputObj); err == nil {
					argsStr = string(b)
				}
			}

			fnMap := map[string]interface{}{
				"name":      name,
				"arguments": argsStr,
			}
			tcMap := map[string]interface{}{
				"id":       id,
				"type":     "function",
				"function": fnMap,
			}
			if sig, ok := block["thought_signature"]; ok && sig != nil && sig != "" {
				fnMap["thought_signature"] = sig
				tcMap["thought_signature"] = sig
			}
			if sig, ok := block["thoughtSignature"]; ok && sig != nil && sig != "" {
				fnMap["thoughtSignature"] = sig
				tcMap["thoughtSignature"] = sig
			}
			toolCalls = append(toolCalls, tcMap)
		}
	}
	return toolCalls
}

// NormalizeGoogleFunctionCall converts Gemini functionCall parts to OpenAI tool_calls
func NormalizeGoogleFunctionCall(parts []interface{}) []map[string]interface{} {
	var toolCalls []map[string]interface{}
	for idx, item := range parts {
		part, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		if fc, hasFc := part["functionCall"].(map[string]interface{}); hasFc {
			name, _ := fc["name"].(string)
			argsObj := fc["args"]
			argsStr := "{}"
			if argsObj != nil {
				if b, err := json.Marshal(argsObj); err == nil {
					argsStr = string(b)
				}
			}
			id := fmt.Sprintf("call_google_%d", idx)
			fnMap := map[string]interface{}{
				"name":      name,
				"arguments": argsStr,
			}
			tcMap := map[string]interface{}{
				"id":       id,
				"type":     "function",
				"function": fnMap,
			}
			if sig, ok := fc["thought_signature"]; ok && sig != nil && sig != "" {
				fnMap["thought_signature"] = sig
				tcMap["thought_signature"] = sig
			}
			if sig, ok := fc["thoughtSignature"]; ok && sig != nil && sig != "" {
				fnMap["thoughtSignature"] = sig
				tcMap["thoughtSignature"] = sig
			}
			if sig, ok := part["thought_signature"]; ok && sig != nil && sig != "" {
				fnMap["thought_signature"] = sig
				tcMap["thought_signature"] = sig
			}
			if sig, ok := part["thoughtSignature"]; ok && sig != nil && sig != "" {
				fnMap["thoughtSignature"] = sig
				tcMap["thoughtSignature"] = sig
			}
			toolCalls = append(toolCalls, tcMap)
		}
	}
	return toolCalls
}
