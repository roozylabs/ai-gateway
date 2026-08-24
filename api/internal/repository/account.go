package repository

import (
	"context"
	"database/sql"

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
	err := r.db.QueryRowContext(ctx,
		`SELECT id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
		 FROM account WHERE "userId" = $1 AND "providerId" = 'credential'`, userID,
	).Scan(&account.ID, &account.AccountID, &account.ProviderID,
		&account.UserID, &account.Password, &account.CreatedAt, &account.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return account, nil
}

func (r *AccountRepository) Create(ctx context.Context, account *models.Account) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
		account.ID, account.AccountID, account.ProviderID,
		account.UserID, account.Password,
	)
	return err
}
