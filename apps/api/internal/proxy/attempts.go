package proxy

import (
	"encoding/json"
	"fmt"
	"time"
)

// AttemptRecord captures one failed credential attempt inside the proxy retry loop.
type AttemptRecord struct {
	AttemptID    string    `json:"attempt_id,omitempty"`
	ExecutionID  string    `json:"execution_id,omitempty"`
	RequestID    string    `json:"request_id,omitempty"`
	CredentialID string    `json:"credential_id"`
	Model        string    `json:"model"`
	ProviderID   string    `json:"provider_id"`
	StatusCode   int       `json:"status_code"`
	Error        string    `json:"error,omitempty"`
	DurationMS   int64     `json:"duration_ms"`
	At           time.Time `json:"at"`
}

// FailoverInfo carries failover attempt history out of the engine retry loops
// so the gateway handler can enrich the failure request log row.
type FailoverInfo struct {
	Attempts   []byte
	LastStatus int
	Retries    int
}

const CtxFailoverInfo = "failover_info"

// MarshalAttempts encodes records for the JSONB column; nil/empty → nil.
func MarshalAttempts(recs []AttemptRecord) []byte {
	if len(recs) == 0 {
		return nil
	}
	data, err := json.Marshal(recs)
	if err != nil {
		return nil
	}
	return data
}

func newAttemptRecordWithCorrelation(route *Route, statusCode int, errMsg string, started time.Time, attemptNum int, executionID, requestID string) AttemptRecord {
	modelSlug := ""
	if route.Model != nil {
		modelSlug = route.Model.Slug
	}
	return AttemptRecord{
		AttemptID:    fmt.Sprintf("attempt-%d", attemptNum),
		ExecutionID:  executionID,
		RequestID:    requestID,
		CredentialID: route.Credential.ID,
		Model:        modelSlug,
		ProviderID:   route.Credential.ProviderID,
		StatusCode:   statusCode,
		Error:        errMsg,
		DurationMS:   time.Since(started).Milliseconds(),
		At:           time.Now(),
	}
}

func newAttemptRecord(route *Route, statusCode int, errMsg string, started time.Time) AttemptRecord {
	return newAttemptRecordWithCorrelation(route, statusCode, errMsg, started, 1, "", "")
}
