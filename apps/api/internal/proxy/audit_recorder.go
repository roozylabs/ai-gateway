package proxy

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/roozylabs/prism/internal/models"
	"github.com/roozylabs/prism/internal/repository"
)

type AuditRecorder struct {
	repo *repository.AuditTrailRepository
}

func NewAuditRecorder(repo *repository.AuditTrailRepository) *AuditRecorder {
	return &AuditRecorder{repo: repo}
}

func HashPayload(payload string) string {
	if payload == "" {
		return ""
	}
	hash := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(hash[:])
}

func ComputeSignatureHash(reqID, userID, promptHash, responseHash, modelSlug string) string {
	raw := fmt.Sprintf("%s:%s:%s:%s:%s", reqID, userID, promptHash, responseHash, modelSlug)
	hash := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(hash[:])
}

func (r *AuditRecorder) Record(ctx context.Context, trail *models.AIAuditTrail) error {
	if trail.SignatureHash == "" {
		trail.SignatureHash = ComputeSignatureHash(
			trail.RequestID,
			trail.UserID,
			trail.PromptHash,
			trail.ResponseHash,
			trail.ModelSlug,
		)
	}
	return r.repo.Create(ctx, trail)
}

func (r *AuditRecorder) VerifyIntegrity(ctx context.Context, id, userID string) (*models.AuditVerificationResult, error) {
	trail, err := r.repo.FindByID(ctx, id, userID)
	if err != nil {
		return nil, fmt.Errorf("audit trail not found: %w", err)
	}

	expectedHash := ComputeSignatureHash(
		trail.RequestID,
		trail.UserID,
		trail.PromptHash,
		trail.ResponseHash,
		trail.ModelSlug,
	)

	isValid := trail.SignatureHash == expectedHash
	msg := "Audit record cryptographic signature verified; tamper-free."
	if !isValid {
		msg = "TAMPER WARNING: Cryptographic signature mismatch detected!"
	}

	return &models.AuditVerificationResult{
		AuditID:       trail.ID,
		RequestID:     trail.RequestID,
		Valid:         isValid,
		SignatureHash: trail.SignatureHash,
		ExpectedHash:  expectedHash,
		Message:       msg,
	}, nil
}
