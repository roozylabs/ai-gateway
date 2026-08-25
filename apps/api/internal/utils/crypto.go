package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"strings"

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

// DecryptAES256GCM decrypts AES-256-GCM encrypted text with fallback key support
func DecryptAES256GCM(encrypted, key string) (string, error) {
	if encrypted == "" {
		return "", nil
	}

	if strings.HasPrefix(encrypted, "sk-") || strings.HasPrefix(encrypted, "AIzaSy") || strings.HasPrefix(encrypted, "opencode-") || strings.HasPrefix(encrypted, "ghp_") {
		return encrypted, nil
	}

	keysToTry := []string{
		key,
		"test-encryption-key-32-bytes!!",
		"your-encryption-key-here",
		"secret",
		"cce10b1c939b224142ccfd6046e1830cb6c10f768e13ae34133d5abdb5748b22",
		"1ecd75732a57cc42eaa8c30313568512fbf5d1a5026412d1155d2e9463b54088",
	}

	data, err := base64.URLEncoding.DecodeString(encrypted)
	if err == nil && len(data) > 12 {
		for _, k := range keysToTry {
			if k == "" {
				continue
			}

			keyVariants := [][]byte{deriveKey32(k)}
			if len(k) == 32 {
				keyVariants = append(keyVariants, []byte(k))
			}

			for _, keyBytes := range keyVariants {
				block, err := aes.NewCipher(keyBytes)
				if err != nil {
					continue
				}
				gcm, err := cipher.NewGCM(block)
				if err != nil {
					continue
				}
				nonceSize := gcm.NonceSize()
				if len(data) < nonceSize {
					continue
				}
				nonce, ciphertext := data[:nonceSize], data[nonceSize:]
				plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
				if err == nil {
					return string(plaintext), nil
				}
			}
		}
	}

	return "", ErrDecryptionFailed
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
