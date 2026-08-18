package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv        string
	ServerPort    string
	DatabaseURL   string
	RedisURL      string
	JWTSecret     string
	EncryptionKey string
	HashKey       string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	return &Config{
		AppEnv:        getEnv("APP_ENV", "development"),
		ServerPort:    getEnv("SERVER_PORT", "8080"),
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/ai_gateway?sslmode=disable"),
		RedisURL:      getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:     getEnv("JWT_SECRET", ""),
		EncryptionKey: getEnv("ENCRYPTION_KEY", ""),
		HashKey:       getEnv("HASH_KEY", ""),
	}, nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
