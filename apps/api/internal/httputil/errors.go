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
// It uses c.AbortWithStatusJSON so that both Gin handlers and middleware chains halt safely.
func RespondError(c *gin.Context, status int, clientMessage string, internalErr error, errCode string) {
	if clientMessage == "" {
		clientMessage = http.StatusText(status)
	}
	if clientMessage == "" {
		clientMessage = "An unexpected error occurred"
	}

	errType := "api_error"
	switch {
	case errCode == "TENANT_SECURITY_ERROR":
		errType = "tenant_security_error"
	case errCode == "PERMISSION_DENIED" || errCode == "AUTHORIZATION_ERROR":
		errType = "authorization_error"
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
		c.AbortWithStatusJSON(status, ErrorResponse{
			Error: APIError{
				Message: clientMessage,
				Type:    errType,
				Code:    errCode,
			},
		})
	}
}

// RespondUnauthorized is a shorthand for 401 Unauthorized errors.
func RespondUnauthorized(c *gin.Context, clientMessage string, internalErr error, errCode string) {
	if clientMessage == "" {
		clientMessage = "Authentication required"
	}
	if errCode == "" {
		errCode = "AUTH_REQUIRED"
	}
	RespondError(c, http.StatusUnauthorized, clientMessage, internalErr, errCode)
}

// RespondForbidden is a shorthand for 403 Forbidden errors.
func RespondForbidden(c *gin.Context, clientMessage string, internalErr error, errCode string) {
	if clientMessage == "" {
		clientMessage = "Access forbidden"
	}
	if errCode == "" {
		errCode = "PERMISSION_DENIED"
	}
	RespondError(c, http.StatusForbidden, clientMessage, internalErr, errCode)
}

// RespondNotFound is a shorthand for 404 Not Found errors.
func RespondNotFound(c *gin.Context, clientMessage string, internalErr error, errCode string) {
	if clientMessage == "" {
		clientMessage = "Resource not found"
	}
	if errCode == "" {
		errCode = "NOT_FOUND"
	}
	RespondError(c, http.StatusNotFound, clientMessage, internalErr, errCode)
}

// RespondBadRequest is a shorthand for 400 Bad Request errors.
func RespondBadRequest(c *gin.Context, clientMessage string, internalErr error, errCode string) {
	if clientMessage == "" {
		clientMessage = "Invalid request payload"
	}
	if errCode == "" {
		errCode = "INVALID_REQUEST"
	}
	RespondError(c, http.StatusBadRequest, clientMessage, internalErr, errCode)
}

// RespondInternalError is a shorthand for 500 Internal Server Error.
func RespondInternalError(c *gin.Context, clientMessage string, internalErr error, errCode string) {
	if clientMessage == "" {
		clientMessage = "Internal server error"
	}
	if errCode == "" {
		errCode = "INTERNAL_ERROR"
	}
	RespondError(c, http.StatusInternalServerError, clientMessage, internalErr, errCode)
}
