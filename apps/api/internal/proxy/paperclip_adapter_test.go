package proxy

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestExtractPaperclipContext_HeadersPresent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	req, _ := http.NewRequest("POST", "/v1/adapters/paperclip/chat/completions", nil)
	req.Header.Set("X-Paperclip-Agent-ID", "paperclip-dev-1")
	req.Header.Set("X-Paperclip-Task-ID", "task-999")
	req.Header.Set("X-Paperclip-Project-ID", "proj-42")
	req.Header.Set("X-Paperclip-Workflow-ID", "wf-100")
	c.Request = req

	agentCtx := ExtractPaperclipContext(c)
	assert.NotNil(t, agentCtx)
	assert.Equal(t, "paperclip-dev-1", agentCtx.AgentID)
	assert.Equal(t, "task-999", agentCtx.TaskID)
	assert.Equal(t, "proj-42", agentCtx.ProjectID)
	assert.Equal(t, "wf-100", agentCtx.WorkflowID)
}

func TestExtractPaperclipContext_NoHeadersNil(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	req, _ := http.NewRequest("POST", "/v1/adapters/paperclip/chat/completions", nil)
	c.Request = req

	agentCtx := ExtractPaperclipContext(c)
	assert.Nil(t, agentCtx)
}
