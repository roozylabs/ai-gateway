package utils

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIncrementalHashMatchesWhole(t *testing.T) {
	var buf bytes.Buffer
	h := sha256.New()
	mw := io.MultiWriter(&buf, h)
	for _, part := range []string{"data: a\n\n", "data: b\n\n", "[DONE]"} {
		mw.Write([]byte(part))
	}
	want := sha256.Sum256([]byte("data: a\n\ndata: b\n\n[DONE]"))
	assert.Equal(t, hex.EncodeToString(want[:]), hex.EncodeToString(h.Sum(nil)))
}
