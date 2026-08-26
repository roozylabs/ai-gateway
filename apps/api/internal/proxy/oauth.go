package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	goredis "github.com/roozylabs/prism/internal/redis"
)

type OAuthTokenManager struct {
	cooldown *goredis.CooldownStore
	client   *http.Client
}

func NewOAuthTokenManager(cooldown *goredis.CooldownStore) *OAuthTokenManager {
	return &OAuthTokenManager{
		cooldown: cooldown,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

type GoogleTokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
	Error       string `json:"error"`
	ErrorDesc   string `json:"error_description"`
}

func (m *OAuthTokenManager) GetAccessToken(ctx context.Context, credentialID string, metadata map[string]string) (string, error) {
	// 1. Check Redis cache
	if token, err := m.cooldown.GetAccessToken(ctx, credentialID); err == nil && token != "" {
		return token, nil
	}

	// 2. Fetch fresh access token using refresh_token
	clientID := metadata["client_id"]
	clientSecret := metadata["client_secret"]
	refreshToken := metadata["refresh_token"]

	if clientID == "" || clientSecret == "" || refreshToken == "" {
		return "", fmt.Errorf("invalid oauth metadata: missing client_id, client_secret, or refresh_token")
	}

	form := url.Values{}
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)
	form.Set("refresh_token", refreshToken)
	form.Set("grant_type", "refresh_token")

	req, err := http.NewRequestWithContext(ctx, "POST", "https://oauth2.googleapis.com/token", strings.NewReader(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("create token request failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := m.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read token response failed: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("oauth token exchange failed (HTTP %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var tokenResp GoogleTokenResponse
	if err := json.Unmarshal(bodyBytes, &tokenResp); err != nil {
		return "", fmt.Errorf("parse token response failed: %w", err)
	}

	if tokenResp.Error != "" {
		return "", fmt.Errorf("google oauth error: %s - %s", tokenResp.Error, tokenResp.ErrorDesc)
	}

	if tokenResp.AccessToken == "" {
		return "", fmt.Errorf("empty access_token received from google oauth")
	}

	// 3. Cache token in Redis (ExpiresIn minus 300s buffer, min 60s)
	ttl := tokenResp.ExpiresIn - 300
	if ttl < 60 {
		ttl = 60
	}
	_ = m.cooldown.SetAccessToken(ctx, credentialID, tokenResp.AccessToken, ttl)

	return tokenResp.AccessToken, nil
}
