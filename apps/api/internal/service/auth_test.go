package service

import (
	"testing"
)

func TestAuthService_Structures(t *testing.T) {
	loginReq := LoginRequest{
		Email:          "test@example.com",
		Password:       "Password123!",
		TurnstileToken: "token123",
	}
	if loginReq.Email != "test@example.com" {
		t.Errorf("unexpected email in LoginRequest")
	}

	signupReq := SignupRequest{
		Name:           "Test User",
		Email:          "test@example.com",
		Password:       "Password123!",
		TurnstileToken: "token123",
	}
	if signupReq.Name != "Test User" || signupReq.Email != "test@example.com" {
		t.Errorf("unexpected values in SignupRequest")
	}
}
