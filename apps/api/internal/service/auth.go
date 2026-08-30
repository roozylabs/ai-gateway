package service

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/repository"
	"github.com/roozylabs/prism/internal/utils"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrSessionExpired     = errors.New("session expired")
	ErrSessionNotFound    = errors.New("session not found")
)

type AuthService struct {
	users    *repository.UserRepository
	sessions *repository.SessionRepository
	accounts *repository.AccountRepository
}

func NewAuthService(
	users *repository.UserRepository,
	sessions *repository.SessionRepository,
	accounts *repository.AccountRepository,
) *AuthService {
	return &AuthService{
		users:    users,
		sessions: sessions,
		accounts: accounts,
	}
}

type LoginRequest struct {
	Email          string `json:"email" binding:"required"`
	Password       string `json:"password" binding:"required"`
	TurnstileToken string `json:"turnstileToken"`
}

type LoginResponse struct {
	Token string      `json:"token"`
	User  *models.User `json:"user"`
}

func (s *AuthService) Login(ctx context.Context, email, password, ip, ua string) (*LoginResponse, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	account, err := s.accounts.FindByUserID(ctx, user.ID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if account.Password == "" || !utils.CheckPassword(password, account.Password) {
		return nil, ErrInvalidCredentials
	}

	token := utils.HashSHA256(uuid.New().String())
	session := &models.Session{
		ID:        uuid.New().String(),
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
		Token:     token,
		IPAddress: ip,
		UserAgent: ua,
		UserID:    user.ID,
	}

	if err := s.sessions.Create(ctx, session); err != nil {
		return nil, err
	}

	return &LoginResponse{Token: token, User: user}, nil
}

func (s *AuthService) CreateOAuthSession(ctx context.Context, email, name, image, provider, ip, ua string) (*LoginResponse, error) {
	if email == "" {
		email = provider + "_user@prism.local"
	}
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			userID := uuid.New().String()
			userName := name
			if userName == "" {
				userName = strings.ToUpper(provider[:1]) + provider[1:] + " Developer"
			}
			user = &models.User{
				ID:            userID,
				Name:          userName,
				Email:         email,
				EmailVerified: true,
				Image:         image,
				IsOnboarded:   false,
				AuthProvider:  provider,
				PrimaryRole:   "developer",
			}
			if createErr := s.users.Create(ctx, user); createErr != nil {
				return nil, createErr
			}
		} else {
			return nil, err
		}
	}

	token := utils.HashSHA256(uuid.New().String())
	session := &models.Session{
		ID:        uuid.New().String(),
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
		Token:     token,
		IPAddress: ip,
		UserAgent: ua,
		UserID:    user.ID,
	}

	if err := s.sessions.Create(ctx, session); err != nil {
		return nil, err
	}

	return &LoginResponse{Token: token, User: user}, nil
}

func (s *AuthService) Logout(ctx context.Context, token string) error {
	return s.sessions.Delete(ctx, token)
}

func (s *AuthService) Me(ctx context.Context, token string) (*models.User, error) {
	session, err := s.sessions.FindValidByToken(ctx, token)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, err
	}

	if session.ExpiresAt.Before(time.Now()) {
		return nil, ErrSessionExpired
	}

	user, err := s.users.FindByID(ctx, session.UserID)
	if err != nil {
		return nil, err
	}

	return user, nil
}
