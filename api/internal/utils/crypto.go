package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEncryptionFailed = errors.New("encryption failed")
	ErrDecryptionFailed = errors.New("decryption failed")
	ErrInvalidKey       = errors.New("invalid key")
)

// HashSHA256 returns the hex-encoded SHA-256 hash of input
func HashSHA256(input string) string {
	h := sha256.Sum256([]byte(input))
	return hexEncode(h[:])
}

func hexEncode(data []byte) string {
	const hexDigits = "0123456789abcdef"
	result := make([]byte, len(data)*2)
	for i, b := range data {
		result[i*2] = hexDigits[b>>4]
		result[i*2+1] = hexDigits[b&0x0f]
	}
	return string(result)
}

// EncryptAES256GCM encrypts plaintext using AES-256-GCM
func EncryptAES256GCM(plaintext, key string) (string, error) {
	keyBytes := deriveKey32(key)

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", ErrEncryptionFailed
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", ErrEncryptionFailed
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", ErrEncryptionFailed
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.URLEncoding.EncodeToString(ciphertext), nil
}

// DecryptAES256GCM decrypts AES-256-GCM encrypted text
func DecryptAES256GCM(encrypted, key string) (string, error) {
	keyBytes := deriveKey32(key)

	data, err := base64.URLEncoding.DecodeString(encrypted)
	if err != nil {
		return "", ErrDecryptionFailed
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", ErrDecryptionFailed
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", ErrDecryptionFailed
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", ErrDecryptionFailed
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", ErrDecryptionFailed
	}

	return string(plaintext), nil
}

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPassword verifies a password against a bcrypt hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// deriveKey32 ensures the key is exactly 32 bytes for AES-256
func deriveKey32(key string) []byte {
	hash := sha256.Sum256([]byte(key))
	return hash[:]
}
