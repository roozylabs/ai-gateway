package repository

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/roozylabs/prism/internal/models"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}
	var name, image, orgID, primaryRole, authProvider sql.NullString
	var isOnboarded sql.NullBool
	cleanedEmail := strings.TrimSpace(strings.ToLower(email))
	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, email, "emailVerified", image, org_id, is_onboarded, primary_role, auth_provider, "createdAt", "updatedAt"
		 FROM "user" WHERE LOWER(email) = LOWER($1)`, cleanedEmail,
	).Scan(&user.ID, &name, &user.Email, &user.EmailVerified,
		&image, &orgID, &isOnboarded, &primaryRole, &authProvider, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	user.Name = name.String
	user.Image = image.String
	user.OrgID = orgID.String
	user.IsOnboarded = isOnboarded.Bool
	user.PrimaryRole = primaryRole.String
	user.AuthProvider = authProvider.String
	return user, nil
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	user := &models.User{}
	var name, image, orgID, primaryRole, authProvider sql.NullString
	var isOnboarded sql.NullBool
	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, email, "emailVerified", image, org_id, is_onboarded, primary_role, auth_provider, "createdAt", "updatedAt"
		 FROM "user" WHERE id = $1`, id,
	).Scan(&user.ID, &name, &user.Email, &user.EmailVerified,
		&image, &orgID, &isOnboarded, &primaryRole, &authProvider, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	user.Name = name.String
	user.Image = image.String
	user.OrgID = orgID.String
	user.IsOnboarded = isOnboarded.Bool
	user.PrimaryRole = primaryRole.String
	user.AuthProvider = authProvider.String
	return user, nil
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO "user" (id, name, email, "emailVerified", image, org_id, is_onboarded, primary_role, auth_provider, "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		user.ID, user.Name, user.Email, user.EmailVerified,
		user.Image, user.OrgID, user.IsOnboarded, user.PrimaryRole, user.AuthProvider,
		user.CreatedAt, user.UpdatedAt,
	)
	return err
}

func (r *UserRepository) UpdateOnboardingStatus(ctx context.Context, userID, orgID, role string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE "user" SET is_onboarded = true, org_id = $1, primary_role = $2, "updatedAt" = NOW() WHERE id = $3`,
		orgID, role, userID,
	)
	return err
}
