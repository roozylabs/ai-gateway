package proxy

import (
	"context"
	"testing"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/roozylabs/prism/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mcpServerFinderMock struct {
	srv *models.MCPServer
	err error
}

func (m *mcpServerFinderMock) FindByUserAndName(ctx context.Context, userID, name string) (*models.MCPServer, error) {
	return m.srv, m.err
}

func (m *mcpServerFinderMock) FindByID(ctx context.Context, id, userID string) (*models.MCPServer, error) {
	return m.srv, m.err
}

func (m *mcpServerFinderMock) UpdateStatus(ctx context.Context, id, status string) error {
	if m.srv != nil {
		m.srv.Status = status
	}
	return nil
}

func (m *mcpServerFinderMock) GetServerWithTools(ctx context.Context, server *models.MCPServer) (*models.MCPServerWithTools, error) {
	return &models.MCPServerWithTools{Server: *server}, nil
}

type mcpToolBatchSaverMock struct {
	tools []models.MCPTool
}

func (m *mcpToolBatchSaverMock) BatchUpsert(ctx context.Context, serverID string, tools []models.MCPTool) error {
	m.tools = tools
	return nil
}

// newTestMCPServer builds a real in-process MCP server exposing echo/create tools.
func newTestMCPServer() *server.MCPServer {
	ms := server.NewMCPServer("github-mcp", "1.0.0")
	ms.AddTool(
		mcp.NewTool("create_issue", mcp.WithDescription("Create GitHub Issue")),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			return mcp.NewToolResultText(`{"status":"created","issue_id":101}`), nil
		},
	)
	return ms
}

func TestMCPGatewaySyncServerTools(t *testing.T) {
	ts := server.NewTestStreamableHTTPServer(newTestMCPServer())
	defer ts.Close()

	mcpSrv := &models.MCPServer{
		ID:            "s1",
		UserID:        "u1",
		Name:          "github-mcp",
		EndpointURL:   ts.URL,
		TransportType: "http",
		Enabled:       true,
	}

	saver := &mcpToolBatchSaverMock{}
	gw := NewMCPGateway(&mcpServerFinderMock{srv: mcpSrv}, saver)

	res, err := gw.SyncServerTools(context.Background(), "s1", "u1", "")
	require.NoError(t, err)
	assert.Equal(t, "github-mcp", res.Server.Name)
	assert.Equal(t, "connected", res.Server.Status)
	assert.Len(t, saver.tools, 1)
	assert.Equal(t, "create_issue", saver.tools[0].Name)
	assert.NotEmpty(t, saver.tools[0].InputSchema)
}

func TestMCPGatewayExecuteToolSuccess(t *testing.T) {
	ts := server.NewTestStreamableHTTPServer(newTestMCPServer())
	defer ts.Close()

	mcpSrv := &models.MCPServer{
		ID:            "s1",
		UserID:        "u1",
		Name:          "github-mcp",
		EndpointURL:   ts.URL,
		TransportType: "http",
		Enabled:       true,
	}

	gw := NewMCPGateway(&mcpServerFinderMock{srv: mcpSrv}, &mcpToolBatchSaverMock{})
	res, err := gw.ExecuteTool(context.Background(), "u1", "github-mcp", "create_issue", map[string]interface{}{"title": "Bug fix"}, "")
	require.NoError(t, err)
	assert.Equal(t, "github-mcp", res.Server)
	assert.Equal(t, "create_issue", res.Tool)
	assert.Equal(t, 200, res.StatusCode)
	assert.Equal(t, `{"status":"created","issue_id":101}`, res.Result)
	assert.GreaterOrEqual(t, res.LatencyMs, 0)
}

func TestMCPGatewayExecuteToolSuccess_SSE(t *testing.T) {
	ts := server.NewTestServer(newTestMCPServer())
	defer ts.Close()

	mcpSrv := &models.MCPServer{
		ID:            "s1",
		UserID:        "u1",
		Name:          "ctx-sse",
		EndpointURL:   ts.URL + "/sse",
		TransportType: "sse",
		Enabled:       true,
	}

	gw := NewMCPGateway(&mcpServerFinderMock{srv: mcpSrv}, &mcpToolBatchSaverMock{})
	res, err := gw.ExecuteTool(context.Background(), "u1", "ctx-sse", "create_issue", map[string]interface{}{"title": "Bug fix"}, "")
	require.NoError(t, err)
	assert.Equal(t, "ctx-sse", res.Server)
	assert.Equal(t, 200, res.StatusCode)
	assert.Equal(t, `{"status":"created","issue_id":101}`, res.Result)
}
