package proxy

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEncodeDecodeEnvelopeRoundTrip(t *testing.T) {
	body := []byte(`{"choices":[{"message":{"content":"Hello"}}]}`)
	env := EncodeEnvelope(200, "application/json", body, false)

	status, ct, got, truncated, err := DecodeEnvelope(env)
	require.NoError(t, err)
	assert.Equal(t, 200, status)
	assert.Equal(t, "application/json", ct)
	assert.Equal(t, body, got)
	assert.False(t, truncated)
}

func TestEncodeDecodeEnvelopeTruncated(t *testing.T) {
	body := []byte(`{"partial":"data"}`)
	env := EncodeEnvelope(200, "text/event-stream", body, true)

	status, ct, got, truncated, err := DecodeEnvelope(env)
	require.NoError(t, err)
	assert.Equal(t, 200, status)
	assert.Equal(t, "text/event-stream", ct)
	assert.Equal(t, body, got)
	assert.True(t, truncated)
}

func TestDecodeEnvelopeInvalidJSON(t *testing.T) {
	_, _, _, _, err := DecodeEnvelope([]byte("not json"))
	assert.Error(t, err)
}

func TestEnvelopePreservesEmptyBody(t *testing.T) {
	env := EncodeEnvelope(204, "", nil, false)
	status, _, got, _, err := DecodeEnvelope(env)
	require.NoError(t, err)
	assert.Equal(t, 204, status)
	assert.Nil(t, got)
}
