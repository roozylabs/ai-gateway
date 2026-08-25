package proxy

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestMarshalAttemptsRoundTrip(t *testing.T) {
	at := time.Date(2026, 8, 23, 10, 0, 0, 0, time.UTC)
	recs := []AttemptRecord{
		{
			CredentialID: "cred-1",
			Model:        "gpt-4o",
			ProviderID:   "prov-1",
			StatusCode:   429,
			Error:        "upstream rate limit (429) on credential cred-1 (retry after 5s)",
			DurationMS:   120,
			At:           at,
		},
		{
			CredentialID: "cred-2",
			Model:        "claude-sonnet",
			ProviderID:   "prov-2",
			StatusCode:   502,
			DurationMS:   340,
			At:           at.Add(time.Second),
		},
	}

	data := MarshalAttempts(recs)
	require.NotNil(t, data)
	require.True(t, json.Valid(data))

	var got []AttemptRecord
	require.NoError(t, json.Unmarshal(data, &got))
	require.Len(t, got, 2)
	require.Equal(t, recs[0], got[0])
	require.Equal(t, recs[1], got[1])
}

func TestMarshalAttemptsEmptyReturnsNil(t *testing.T) {
	require.Nil(t, MarshalAttempts(nil))
	require.Nil(t, MarshalAttempts([]AttemptRecord{}))
}
