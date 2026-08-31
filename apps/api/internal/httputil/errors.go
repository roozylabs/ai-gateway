// Package httputil provides HTTP response formatting and sanitized error management.
package httputil

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// APIError represents the standard, sanitized client-facing error structure.
type APIError struct {
	Message string `json:"message"`
	Type    string `json:"type,omitempty"`
	Code    string `json:"code,omitempty"`
}

// ErrorResponse wraps the standard error object in the root JSON response.
type ErrorResponse struct {
	Error APIError `json:"error"`
}

// RespondError logs the detailed internal error on the server side with request context,
// and returns a sanitized, clean, user-friendly JSON error to the HTTP client.
func RespondError(c *gin.Context, status int, clientMessage string, internalErr error, errCode string) {
	if clientMessage == "" {
		clientMessage = http.StatusText(status)
	}
	if clientMessage == "" {
		clientMessage = "An unexpected error occurred"
	}

	errType := "api_error"
	switch {
	case status == http.StatusUnauthorized:
		errType = "auth_error"
	case status == http.StatusForbidden:
		errType = "forbidden_error"
	case status == http.StatusNotFound:
		errType = "not_found_error"
	case status == http.StatusUnprocessableEntity || status == http.StatusBadRequest:
		errType = "validation_error"
	case status == http.StatusTooManyRequests:
		errType = "rate_limit_error"
	case status >= 500:
		errType = "server_error"
	}

	// Server-side structured error logging
	userID := ""
	if c != nil {
		userID = c.GetString("userId")
		if userID == "" {
			userID = c.GetString("user_id")
		}
	}
	method := ""
	path := ""
	if c != nil && c.Request != nil {
		method = c.Request.Method
		path = c.Request.URL.Path
	}

	if internalErr != nil {
		log.Printf("[API ERROR] %s %s | status=%d | code=%s | user=%s | details: %v",
			method, path, status, errCode, userID, internalErr)
	} else {
		log.Printf("[API ERROR] %s %s | status=%d | code=%s | user=%s | message: %s",
			method, path, status, errCode, userID, clientMessage)
	}

	if c != nil {
		c.JSON(status, ErrorResponse{
			Error: APIError{
				Message: clientMessage,
				Type:    errType,
				Code:    errCode,
			},
		})
	}
}
