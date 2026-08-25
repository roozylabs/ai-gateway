package proxy

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

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

func TestMCPGatewaySyncServerTools(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		var req map[string]interface{}
		_ = json.NewDecoder(r.Body).Decode(&req)
		assert.Equal(t, "tools/list", req["method"])

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      req["id"],
			"result": map[string]interface{}{
				"tools": []map[string]interface{}{
					{"name": "create_issue", "description": "Create GitHub Issue"},
				},
			},
		})
	}))
	defer srv.Close()

	mcpSrv := &models.MCPServer{
		ID:          "s1",
		UserID:      "u1",
		Name:        "github-mcp",
		EndpointURL: srv.URL,
		Enabled:     true,
	}

	saver := &mcpToolBatchSaverMock{}
	gw := NewMCPGateway(&mcpServerFinderMock{srv: mcpSrv}, saver)

	res, err := gw.SyncServerTools(context.Background(), "s1", "u1", "")
	require.NoError(t, err)
	assert.Equal(t, "github-mcp", res.Server.Name)
	assert.Equal(t, "connected", res.Server.Status)
	assert.Len(t, saver.tools, 1)
	assert.Equal(t, "create_issue", saver.tools[0].Name)
}

func TestMCPGatewayExecuteToolSuccess(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req map[string]interface{}
		_ = json.NewDecoder(r.Body).Decode(&req)
		assert.Equal(t, "tools/call", req["method"])

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      req["id"],
			"result":  map[string]interface{}{"status": "created", "issue_id": 101},
		})
	}))
	defer srv.Close()

	mcpSrv := &models.MCPServer{
		ID:          "s1",
		UserID:      "u1",
		Name:        "github-mcp",
		EndpointURL: srv.URL,
		Enabled:     true,
	}

	gw := NewMCPGateway(&mcpServerFinderMock{srv: mcpSrv}, &mcpToolBatchSaverMock{})
	res, err := gw.ExecuteTool(context.Background(), "u1", "github-mcp", "create_issue", map[string]interface{}{"title": "Bug fix"}, "")
	require.NoError(t, err)
	assert.Equal(t, "github-mcp", res.Server)
	assert.Equal(t, "create_issue", res.Tool)
	assert.Equal(t, 200, res.StatusCode)
	assert.GreaterOrEqual(t, res.LatencyMs, 0)
}
