package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
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
	headers := map[string]string{}
	if srv.AuthTokenEncrypted != nil && *srv.AuthTokenEncrypted != "" && encKey != "" {
		token, err := utils.DecryptAES256GCM(*srv.AuthTokenEncrypted, encKey)
		if err != nil {
			log.Printf("[mcp-gateway] decrypt auth token failed for %q: %v", srv.Name, err)
		} else if token != "" {
			headers["Authorization"] = "Bearer " + token
		}
	}

	var t transport.Interface
	var err error
	switch strings.ToLower(strings.TrimSpace(srv.TransportType)) {
	case "sse":
		t, err = transport.NewSSE(srv.EndpointURL, transport.WithHeaders(headers))
	case "websocket", "ws":
		return nil, fmt.Errorf("mcp server %q: websocket transport is not supported", srv.Name)
	default: // "http", "streamable", "" -> Streamable HTTP (Context7, etc.)
		t, err = transport.NewStreamableHTTP(srv.EndpointURL, transport.WithHTTPHeaders(headers))
	}
	if err != nil {
		return nil, fmt.Errorf("build mcp transport for %q: %w", srv.Name, err)
	}

	c := client.NewClient(t)
	if err := c.Start(ctx); err != nil {
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

	c, err := newMCPClient(ctx, srv, encKey)
	if err != nil {
		_ = g.servers.UpdateStatus(ctx, srv.ID, "error")
		return nil, err
	}
	defer func() { _ = c.Close() }()

	start := time.Now()
	callRes, err := c.CallTool(ctx, mcp.CallToolRequest{
		Params: mcp.CallToolParams{
			Name:      toolName,
			Arguments: args,
		},
	})
	latencyMs := int(time.Since(start).Milliseconds())
	if err != nil {
		_ = g.servers.UpdateStatus(ctx, srv.ID, "error")
		return nil, fmt.Errorf("mcp tool call %q on %q: %w", toolName, srv.Name, err)
	}

	_ = g.servers.UpdateStatus(ctx, srv.ID, "connected")
	return &models.MCPToolExecutionResult{
		Server:     srv.Name,
		Tool:       toolName,
		StatusCode: http.StatusOK,
		Result:     extractToolResult(callRes),
		LatencyMs:  latencyMs,
	}, nil
}

// extractToolResult flattens MCP tool content blocks into a single value.
func extractToolResult(res *mcp.CallToolResult) interface{} {
	if res == nil {
		return nil
	}
	var sb strings.Builder
	for _, content := range res.Content {
		switch tc := content.(type) {
		case *mcp.TextContent:
			sb.WriteString(tc.Text)
		case mcp.TextContent:
			sb.WriteString(tc.Text)
		}
	}
	if sb.Len() > 0 {
		return sb.String()
	}
	if res.StructuredContent != nil {
		return res.StructuredContent
	}
	return nil
}
