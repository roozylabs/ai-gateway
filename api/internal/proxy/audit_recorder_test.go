package proxy

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestHashPayload(t *testing.T) {
	prompt := "Explain Quantum Computing"
	h1 := HashPayload(prompt)
	h2 := HashPayload(prompt)

	assert.NotEmpty(t, h1)
	assert.Equal(t, h1, h2)
	assert.Len(t, h1, 64) // SHA-256 hex string is 64 characters
}

func TestComputeSignatureHash(t *testing.T) {
	reqID := "req-12345"
	userID := "user-admin"
	pHash := HashPayload("Hello World")
	rHash := HashPayload("AI Response")
	model := "gpt-4o"

	sig1 := ComputeSignatureHash(reqID, userID, pHash, rHash, model)
	sig2 := ComputeSignatureHash(reqID, userID, pHash, rHash, model)

	assert.NotEmpty(t, sig1)
	assert.Equal(t, sig1, sig2)
	assert.Len(t, sig1, 64)

	// Tamper test
	sigTampered := ComputeSignatureHash(reqID, userID, pHash, HashPayload("Tampered Response"), model)
	assert.NotEqual(t, sig1, sigTampered)
}
