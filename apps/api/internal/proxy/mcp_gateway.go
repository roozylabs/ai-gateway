package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/mark3labs/mcp-go/client"
	"github.com/mark3labs/mcp-go/client/transport"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/utils"
)

const mcpClientName = "prism-mcp"

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

// newMCPClient builds a transport-aware MCP client, performs the initialize
// handshake, and returns a ready-to-use client. The caller must Close() it.
func newMCPClient(ctx context.Context, srv *models.MCPServer, encKey string) (*client.Client, error) {
	if strings.EqualFold(strings.TrimSpace(srv.Type), "local") {
		return newLocalMCPClient(ctx, srv, encKey)
	}
	return newRemoteMCPClient(ctx, srv, encKey)
}

// resolveMCPHeaders decrypts the server's headers_encrypted payload and falls
// back to the legacy auth_token_encrypted bearer token for older rows.
func resolveMCPHeaders(srv *models.MCPServer, encKey string) map[string]string {
	headers := map[string]string{}
	if srv.HeadersEncrypted != nil && *srv.HeadersEncrypted != "" && encKey != "" {
		raw, err := utils.DecryptAES256GCM(*srv.HeadersEncrypted, encKey)
		if err != nil {
			log.Printf("[mcp-gateway] decrypt headers failed for %q: %v", srv.Name, err)
		} else if raw != "" {
			if err := json.Unmarshal([]byte(raw), &headers); err != nil {
				log.Printf("[mcp-gateway] unmarshal headers failed for %q: %v", srv.Name, err)
			}
		}
	}
	// Legacy single-token fallback.
	if len(headers) == 0 && srv.AuthTokenEncrypted != nil && *srv.AuthTokenEncrypted != "" && encKey != "" {
		token, err := utils.DecryptAES256GCM(*srv.AuthTokenEncrypted, encKey)
		if err != nil {
			log.Printf("[mcp-gateway] decrypt auth token failed for %q: %v", srv.Name, err)
		} else if token != "" {
			headers["Authorization"] = "Bearer " + token
		}
	}
	return headers
}

// newRemoteMCPClient builds an SSE or StreamableHTTP client for remote servers.
func newRemoteMCPClient(ctx context.Context, srv *models.MCPServer, encKey string) (*client.Client, error) {
	headers := resolveMCPHeaders(srv, encKey)

	var t transport.Interface
	var err error
	switch strings.ToLower(strings.TrimSpace(srv.TransportType)) {
	case "sse":
		t, err = transport.NewSSE(srv.EndpointURL, transport.WithHeaders(headers))
	case "websocket", "ws":
		return nil, fmt.Errorf("mcp server %q: websocket transport is not supported (remote endpoints support HTTP or SSE)", srv.Name)
	default: // "http", "streamable", "" -> Streamable HTTP (Context7, etc.)
		t, err = transport.NewStreamableHTTP(srv.EndpointURL, transport.WithHTTPHeaders(headers))
	}
	if err != nil {
		return nil, fmt.Errorf("build mcp transport for %q: %w", srv.Name, err)
	}
	return initializeClient(ctx, srv, t)
}

// newLocalMCPClient builds a stdio client that spawns the local command.
func newLocalMCPClient(ctx context.Context, srv *models.MCPServer, encKey string) (*client.Client, error) {
	if strings.TrimSpace(srv.Command) == "" {
		return nil, fmt.Errorf("mcp server %q: command is required for local transport", srv.Name)
	}
	envSlice := []string{}
	for k, v := range srv.Env {
		envSlice = append(envSlice, k+"="+v)
	}
	t := transport.NewStdio(srv.Command, envSlice, srv.Args...)
	return initializeClient(ctx, srv, t)
}

// initializeClient starts the transport and performs the initialize handshake.
func initializeClient(ctx context.Context, srv *models.MCPServer, t transport.Interface) (*client.Client, error) {
	c := client.NewClient(t)
	if err := c.Start(ctx); err != nil {
		errStr := err.Error()
		if strings.EqualFold(strings.TrimSpace(srv.TransportType), "sse") && (strings.Contains(errStr, "405") || strings.Contains(errStr, "404")) {
			return nil, fmt.Errorf("start mcp transport for %q: %w (endpoint may require HTTP POST JSON-RPC transport; try setting Transport Protocol to HTTP)", srv.Name, err)
		}
		return nil, fmt.Errorf("start mcp transport for %q: %w", srv.Name, err)
	}
	if _, err := c.Initialize(ctx, mcp.InitializeRequest{
		Params: mcp.InitializeParams{
			ClientInfo: mcp.Implementation{Name: mcpClientName, Version: "1.0.0"},
		},
	}); err != nil {
		_ = c.Close()
		return nil, fmt.Errorf("mcp initialize for %q: %w", srv.Name, err)
	}
	return c, nil
}

func (g *MCPGateway) SyncServerTools(ctx context.Context, serverID, userID, encKey string) (*models.MCPServerWithTools, error) {
	srv, err := g.servers.FindByID(ctx, serverID, userID)
	if err != nil {
		return nil, fmt.Errorf("resolve mcp server: %w", err)
	}

	c, err := newMCPClient(ctx, srv, encKey)
	if err != nil {
		_ = g.servers.UpdateStatus(ctx, srv.ID, "offline")
		return nil, err
	}
	defer func() { _ = c.Close() }()

	listRes, err := c.ListTools(ctx, mcp.ListToolsRequest{})
	if err != nil {
		_ = g.servers.UpdateStatus(ctx, srv.ID, "error")
		return nil, fmt.Errorf("mcp list tools for %q: %w", srv.Name, err)
	}

	var newTools []models.MCPTool
	for _, dt := range listRes.Tools {
		schema := json.RawMessage(`{}`)
		if b, err := json.Marshal(dt.InputSchema); err == nil {
			schema = b
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
		return nil, fmt.Errorf("save tools for %q: %w", srv.Name, err)
	}

	_ = g.servers.UpdateStatus(ctx, srv.ID, "connected")
	return g.servers.GetServerWithTools(ctx, srv)
}

func (g *MCPGateway) ExecuteTool(ctx context.Context, userID, serverName, toolName string, args map[string]interface{}, encKey string) (*models.MCPToolExecutionResult, error) {
	startTime := time.Now()
	srv, err := g.servers.FindByUserAndName(ctx, userID, serverName)
	if err != nil {
		return nil, fmt.Errorf("find mcp server %q: %w", serverName, err)
	}
	if srv == nil || !srv.Enabled {
		return nil, fmt.Errorf("mcp server %q is disabled or not found", serverName)
	}

	c, err := newMCPClient(ctx, srv, encKey)
	if err != nil {
		_ = g.servers.UpdateStatus(ctx, srv.ID, "offline")
		return nil, err
	}
	defer func() { _ = c.Close() }()

	res, err := c.CallTool(ctx, mcp.CallToolRequest{
		Params: mcp.CallToolParams{
			Name:      toolName,
			Arguments: args,
		},
	})
	latency := int(time.Since(startTime).Milliseconds())
	if err != nil {
		_ = g.servers.UpdateStatus(ctx, srv.ID, "error")
		return nil, fmt.Errorf("execute mcp tool %s/%s: %w", serverName, toolName, err)
	}

	_ = g.servers.UpdateStatus(ctx, srv.ID, "connected")

	if res.IsError {
		errMsg := "mcp tool returned error"
		if len(res.Content) > 0 {
			if txt, ok := res.Content[0].(mcp.TextContent); ok {
				errMsg = txt.Text
			}
		}
		return nil, fmt.Errorf("tool %s/%s error: %s", serverName, toolName, errMsg)
	}

	var resultObj interface{} = map[string]interface{}{"status": "success"}
	if len(res.Content) > 0 {
		if txt, ok := res.Content[0].(mcp.TextContent); ok {
			var raw interface{}
			if err := json.Unmarshal([]byte(txt.Text), &raw); err == nil {
				resultObj = raw
			} else {
				resultObj = txt.Text
			}
		} else {
			resultObj = res.Content
		}
	}

	return &models.MCPToolExecutionResult{
		Server:     serverName,
		Tool:       toolName,
		StatusCode: 200,
		Result:     resultObj,
		LatencyMs:  latency,
	}, nil
}
