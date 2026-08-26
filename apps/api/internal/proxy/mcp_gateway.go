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

type MCPServerFinder interface {
	FindByUserAndName(ctx context.Context, userID, name string) (*models.MCPServer, error)
	FindByID(ctx context.Context, id, userID string) (*models.MCPServer, error)
	UpdateStatus(ctx context.Context, id, status string) error
	GetServerWithTools(ctx context.Context, server *models.MCPServer) (*models.MCPServerWithTools, error)
}

type MCPToolBatchSaver interface {
	BatchUpsert(ctx context.Context, serverID string, tools []models.MCPTool) error
}

type MCPGateway struct {
	servers MCPServerFinder
	tools   MCPToolBatchSaver
}

func NewMCPGateway(servers MCPServerFinder, tools MCPToolBatchSaver) *MCPGateway {
	return &MCPGateway{servers: servers, tools: tools}
}

// JSON-RPC 2.0 Request / Response structures for MCP
type jsonRPCRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      int64       `json:"id"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params,omitempty"`
}

type jsonRPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int64           `json:"id"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *jsonRPCError   `json:"error,omitempty"`
}

type jsonRPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type mcpDiscoveredTool struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"inputSchema"`
}

type mcpListToolsResult struct {
	Tools []mcpDiscoveredTool `json:"tools"`
}

func (g *MCPGateway) SyncServerTools(ctx context.Context, serverID, userID, encKey string) (*models.MCPServerWithTools, error) {
	srv, err := g.servers.FindByID(ctx, serverID, userID)
	if err != nil {
		return nil, fmt.Errorf("resolve mcp server: %w", err)
	}

	rpcReq := jsonRPCRequest{
		JSONRPC: "2.0",
		ID:      time.Now().UnixNano(),
		Method:  "tools/list",
	}
	body, err := json.Marshal(rpcReq)
	if err != nil {
		return nil, fmt.Errorf("marshal rpc: %w", err)
	}

	respBytes, err := g.sendRPC(ctx, srv, body, encKey)
	if err != nil {
		_ = g.servers.UpdateStatus(ctx, srv.ID, "offline")
		return nil, fmt.Errorf("rpc connect error: %w", err)
	}

	var rpcResp jsonRPCResponse
	if err := json.Unmarshal(respBytes, &rpcResp); err != nil {
		return nil, fmt.Errorf("unmarshal rpc response: %w", err)
	}
	if rpcResp.Error != nil {
		return nil, fmt.Errorf("mcp rpc error %d: %s", rpcResp.Error.Code, rpcResp.Error.Message)
	}

	var listRes mcpListToolsResult
	if err := json.Unmarshal(rpcResp.Result, &listRes); err != nil {
		return nil, fmt.Errorf("parse tools/list result: %w", err)
	}

	var newTools []models.MCPTool
	for _, dt := range listRes.Tools {
		schema := dt.InputSchema
		if len(schema) == 0 {
			schema = json.RawMessage(`{}`)
		}
		newTools = append(newTools, models.MCPTool{
			MCPServerID: srv.ID,
			Name:        dt.Name,
			Description: dt.Description,
			InputSchema: schema,
			Enabled:     true,
		})
	}

	if err := g.tools.BatchUpsert(ctx, srv.ID, newTools); err != nil {
		return nil, fmt.Errorf("batch upsert tools: %w", err)
	}

	_ = g.servers.UpdateStatus(ctx, srv.ID, "connected")
	return g.servers.GetServerWithTools(ctx, srv)
}

func (g *MCPGateway) ExecuteTool(ctx context.Context, userID, serverName, toolName string, args map[string]interface{}, encKey string) (*models.MCPToolExecutionResult, error) {
	srv, err := g.servers.FindByUserAndName(ctx, userID, serverName)
	if err != nil {
		return nil, fmt.Errorf("resolve mcp server %q: %w", serverName, err)
	}
	if !srv.Enabled {
		return nil, fmt.Errorf("mcp server %q is disabled", serverName)
	}

	params := map[string]interface{}{
		"name":      toolName,
		"arguments": args,
	}
	rpcReq := jsonRPCRequest{
		JSONRPC: "2.0",
		ID:      time.Now().UnixNano(),
		Method:  "tools/call",
		Params:  params,
	}
	body, err := json.Marshal(rpcReq)
	if err != nil {
		return nil, fmt.Errorf("marshal tool execution rpc: %w", err)
	}

	start := time.Now()
	respBytes, err := g.sendRPC(ctx, srv, body, encKey)
	latencyMs := int(time.Since(start).Milliseconds())
	if err != nil {
		_ = g.servers.UpdateStatus(ctx, srv.ID, "error")
		return nil, fmt.Errorf("mcp backend error: %w", err)
	}

	var rpcResp jsonRPCResponse
	if err := json.Unmarshal(respBytes, &rpcResp); err != nil {
		return nil, fmt.Errorf("unmarshal rpc execution result: %w", err)
	}
	if rpcResp.Error != nil {
		return nil, fmt.Errorf("mcp execution rpc error %d: %s", rpcResp.Error.Code, rpcResp.Error.Message)
	}

	var parsedResult interface{}
	if err := json.Unmarshal(rpcResp.Result, &parsedResult); err != nil {
		parsedResult = string(rpcResp.Result)
	}

	_ = g.servers.UpdateStatus(ctx, srv.ID, "connected")
	return &models.MCPToolExecutionResult{
		Server:     srv.Name,
		Tool:       toolName,
		StatusCode: http.StatusOK,
		Result:     parsedResult,
		LatencyMs:  latencyMs,
	}, nil
}

func (g *MCPGateway) sendRPC(ctx context.Context, srv *models.MCPServer, body []byte, encKey string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, srv.EndpointURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	if srv.AuthTokenEncrypted != nil && *srv.AuthTokenEncrypted != "" && encKey != "" {
		token, err := utils.DecryptAES256GCM(*srv.AuthTokenEncrypted, encKey)
		if err != nil {
			log.Printf("[mcp-gateway] decrypt auth token failed for %q: %v", srv.Name, err)
		} else {
			req.Header.Set("Authorization", "Bearer "+token)
		}
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http execute: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("mcp server %q returned status %d: %s", srv.Name, resp.StatusCode, string(respBody))
	}

	return respBody, nil
}
