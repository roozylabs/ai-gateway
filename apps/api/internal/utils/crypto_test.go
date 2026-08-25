package utils

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHashSHA256(t *testing.T) {
	hash := HashSHA256("test-input")
	assert.Len(t, hash, 64)
	assert.Equal(t, hash, HashSHA256("test-input"))
	assert.NotEqual(t, hash, HashSHA256("different-input"))
}

func TestEncryptDecryptAES256GCM(t *testing.T) {
	key := "test-secret-key-32bytes-long!!!!!"
	plaintext := "sensitive-api-key-12345"

	encrypted, err := EncryptAES256GCM(plaintext, key)
	require.NoError(t, err)
	assert.NotEqual(t, plaintext, encrypted)

	decrypted, err := DecryptAES256GCM(encrypted, key)
	require.NoError(t, err)
	assert.Equal(t, plaintext, decrypted)
}

func TestDecryptWithWrongKey(t *testing.T) {
	key := "correct-key-32-bytes-long!!!!!!!!"
	wrongKey := "wrong-key-32-bytes-long!!!!!!!!"

	encrypted, err := EncryptAES256GCM("secret", key)
	require.NoError(t, err)

	_, err = DecryptAES256GCM(encrypted, wrongKey)
	assert.Error(t, err)
}

func TestPasswordHash(t *testing.T) {
	hash, err := HashPassword("admin123")
	require.NoError(t, err)
	assert.True(t, CheckPassword("admin123", hash))
	assert.False(t, CheckPassword("wrongpassword", hash))
	assert.True(t, strings.HasPrefix(hash, "$2a$"))
}
