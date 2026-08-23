package proxy

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCanonicalMessagesJSON_RoundTrip(t *testing.T) {
	req := &ProxyRequest{
		Messages: []map[string]interface{}{
			{"role": "system", "content": "You are helpful."},
			{"role": "user", "content": "What is Go?"},
			{"role": "assistant", "content": "A programming language."},
			{"role": "user", "content": "Show me an example."},
		},
	}

	data, ok := canonicalMessagesJSON(req)
	require.True(t, ok, "expected successful marshal for normal messages")
	require.NotNil(t, data)

	var decoded []map[string]interface{}
	require.NoError(t, json.Unmarshal(data, &decoded))
	assert.Len(t, decoded, 4)
	assert.Equal(t, "system", decoded[0]["role"])
	assert.Equal(t, "Show me an example.", decoded[3]["content"])
}

func TestCanonicalMessagesJSON_OversizeRejected(t *testing.T) {
	huge := strings.Repeat("x", maxPayloadBytes)
	req := &ProxyRequest{
		Messages: []map[string]interface{}{
			{"role": "user", "content": huge},
		},
	}

	data, ok := canonicalMessagesJSON(req)
	assert.False(t, ok, "expected oversize payload to be rejected")
	assert.Nil(t, data)
}

func TestCanonicalMessagesJSON_EmptyOrNil(t *testing.T) {
	data, ok := canonicalMessagesJSON(nil)
	assert.False(t, ok)
	assert.Nil(t, data)

	empty := &ProxyRequest{}
	data, ok = canonicalMessagesJSON(empty)
	assert.False(t, ok)
	assert.Nil(t, data)

	noMessages := &ProxyRequest{Model: "gpt-4o"}
	data, ok = canonicalMessagesJSON(noMessages)
	assert.False(t, ok)
	assert.Nil(t, data)
}

func TestExtractLastUserPreview_LastUserTruncated(t *testing.T) {
	longContent := strings.Repeat("a", 300)
	req := &ProxyRequest{
		Messages: []map[string]interface{}{
			{"role": "user", "content": "earlier question"},
			{"role": "assistant", "content": "earlier answer"},
			{"role": "user", "content": longContent},
		},
	}

	preview := extractLastUserPreview(req)
	expected := longContent[:250] + "..."
	assert.Equal(t, expected, preview)
	assert.Len(t, preview, 253)
	assert.True(t, strings.HasSuffix(preview, "..."))
}

func TestExtractLastUserPreview_ShortMessageUntouched(t *testing.T) {
	req := &ProxyRequest{
		Messages: []map[string]interface{}{
			{"role": "user", "content": fmt.Sprintf("%s", "short but clear question")},
			{"role": "assistant", "content": "answer"},
			{"role": "user", "content": "final question"},
		},
	}

	preview := extractLastUserPreview(req)
	assert.Equal(t, "final question", preview)
}

func TestExtractLastUserPreview_NonStringContentSkipped(t *testing.T) {
	multimodal := []interface{}{
		map[string]interface{}{"type": "image_url", "image_url": map[string]interface{}{"url": "https://example.com/img.png"}},
	}

	req := &ProxyRequest{
		Messages: []map[string]interface{}{
			{"role": "user", "content": "text question"},
			{"role": "user", "content": multimodal},
		},
	}
	assert.Equal(t, "text question", extractLastUserPreview(req), "non-string last user message is skipped; earlier string user message is used")

	allMultimodal := &ProxyRequest{
		Messages: []map[string]interface{}{
			{"role": "user", "content": multimodal},
			{"role": "assistant", "content": "I see the image."},
			{"role": "user", "content": []interface{}{map[string]interface{}{"type": "text"}}},
		},
	}
	assert.Equal(t, "", extractLastUserPreview(allMultimodal), "no string user content anywhere and non-string last message must yield empty preview")
}

func TestExtractLastUserPreview_EmptyMessages(t *testing.T) {
	req := &ProxyRequest{}
	assert.Equal(t, "", extractLastUserPreview(req))
	assert.Equal(t, "", extractLastUserPreview(nil))
}
