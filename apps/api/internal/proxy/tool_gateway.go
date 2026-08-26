package proxy

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/utils"
)

type ToolFinder interface {
	GetToolWithBackends(ctx context.Context, userID, toolName string) (*models.ToolWithBackends, error)
}

type ToolGateway struct {
	tools ToolFinder
}

func NewToolGateway(tools ToolFinder) *ToolGateway {
	return &ToolGateway{tools: tools}
}

type ToolExecutionResult struct {
	Tool       string      `json:"tool"`
	Backend    string      `json:"backend"`
	StatusCode int         `json:"statusCode"`
	Result     interface{} `json:"result"`
	LatencyMs  int         `json:"latencyMs"`
}

func (g *ToolGateway) Execute(ctx context.Context, userID, toolName string, args map[string]interface{}, encKey string) (*ToolExecutionResult, error) {
	twb, err := g.tools.GetToolWithBackends(ctx, userID, toolName)
	if err != nil {
		return nil, fmt.Errorf("resolve tool: %w", err)
	}
	if twb == nil {
		return nil, fmt.Errorf("tool %q not found", toolName)
	}
	if !twb.Tool.Enabled {
		return nil, fmt.Errorf("tool %q is disabled", toolName)
	}
	if len(twb.Backends) == 0 {
		return nil, fmt.Errorf("tool %q has no enabled backends", toolName)
	}

	body, err := json.Marshal(args)
	if err != nil {
		return nil, fmt.Errorf("marshal args: %w", err)
	}

	var lastErr error
	for _, backend := range twb.Backends {
		result, err := executeBackend(ctx, &backend, body, encKey)
		if err != nil {
			lastErr = err
			log.Printf("[tool-gateway] backend %q failed: %v", backend.Name, err)
			continue
		}
		result.Tool = toolName
		return result, nil
	}

	return nil, fmt.Errorf("all backends failed for tool %q: %w", toolName, lastErr)
}

func executeBackend(ctx context.Context, backend *models.ToolBackend, body []byte, encKey string) (*ToolExecutionResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, backend.EndpointURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	if backend.AuthTokenEncrypted != nil && encKey != "" {
		token, err := utils.DecryptAES256GCM(*backend.AuthTokenEncrypted, encKey)
		if err != nil {
			return nil, fmt.Errorf("decrypt auth token: %w", err)
		}
		headerVal := backend.AuthHeaderPrefix + token
		req.Header.Set(backend.AuthHeaderName, headerVal)
	}

	timeout := time.Duration(backend.TimeoutMs) * time.Millisecond
	client := &http.Client{Timeout: timeout}

	start := time.Now()
	resp, err := client.Do(req)
	latencyMs := int(time.Since(start).Milliseconds())
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("backend %q returned status %d: %s", backend.Name, resp.StatusCode, string(respBody))
	}

	var result interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		result = string(respBody)
	}

	return &ToolExecutionResult{
		Backend:    backend.Name,
		StatusCode: resp.StatusCode,
		Result:     result,
		LatencyMs:  latencyMs,
	}, nil
}
