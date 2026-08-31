package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/roozylabs/prism/internal/models"
)

type AccountRepository struct {
	db *sql.DB
}

func NewAccountRepository(db *sql.DB) *AccountRepository {
	return &AccountRepository{db: db}
}

func (r *AccountRepository) FindByUserID(ctx context.Context, userID string) (*models.Account, error) {
	account := &models.Account{}
	var password sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, account_id, provider_id, user_id, password, created_at, updated_at
		 FROM account WHERE user_id = $1 AND provider_id = 'credential'`, userID,
	).Scan(&account.ID, &account.AccountID, &account.ProviderID,
		&account.UserID, &password, &account.CreatedAt, &account.UpdatedAt)
	if err != nil {
		return nil, err
	}
	account.Password = password.String
	return account, nil
}

func (r *AccountRepository) Create(ctx context.Context, account *models.Account) error {
	if account.ID == "" {
		account.ID = uuid.New().String()
	}
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
		account.ID, account.AccountID, account.ProviderID,
		account.UserID, account.Password,
	)
	return err
}

func (r *AccountRepository) IsMember(ctx context.Context, userID, orgID string) (bool, error) {
	if userID == "" || orgID == "" {
		return false, nil
	}
	var exists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM organization_members WHERE user_id = $1 AND org_id = $2)`,
		userID, orgID,
	).Scan(&exists)
	return exists, err
}

// GetPrimaryOrganization resolves the first/primary organization a user belongs to.
func (r *AccountRepository) GetPrimaryOrganization(ctx context.Context, userID string) (string, error) {
	if userID == "" {
		return "", nil
	}
	var orgID string
	err := r.db.QueryRowContext(ctx,
		`SELECT org_id FROM organization_members WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
		userID,
	).Scan(&orgID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return orgID, nil
}
