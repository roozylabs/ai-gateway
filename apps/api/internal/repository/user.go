package repository

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/google/uuid"
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
	var name, image, orgID, primaryRole, authProvider, avatarURL sql.NullString
	var isOnboarded, emailVerified sql.NullBool
	cleanedEmail := strings.TrimSpace(strings.ToLower(email))
	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, email, email_verified, image, org_id, is_onboarded, primary_role, auth_provider, avatar_url, created_at, updated_at
		 FROM "user" WHERE LOWER(email) = LOWER($1)`, cleanedEmail,
	).Scan(&user.ID, &name, &user.Email, &emailVerified,
		&image, &orgID, &isOnboarded, &primaryRole, &authProvider, &avatarURL, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	user.Name = name.String
	user.Image = image.String
	user.OrgID = orgID.String
	user.IsOnboarded = isOnboarded.Bool
	user.EmailVerified = emailVerified.Bool
	user.PrimaryRole = primaryRole.String
	user.AuthProvider = authProvider.String
	user.AvatarURL = avatarURL.String
	return user, nil
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	user := &models.User{}
	var name, image, orgID, primaryRole, authProvider, avatarURL sql.NullString
	var isOnboarded, emailVerified sql.NullBool
	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, email, email_verified, image, org_id, is_onboarded, primary_role, auth_provider, avatar_url, created_at, updated_at
		 FROM "user" WHERE id = $1`, id,
	).Scan(&user.ID, &name, &user.Email, &emailVerified,
		&image, &orgID, &isOnboarded, &primaryRole, &authProvider, &avatarURL, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	user.Name = name.String
	user.Image = image.String
	user.OrgID = orgID.String
	user.IsOnboarded = isOnboarded.Bool
	user.EmailVerified = emailVerified.Bool
	user.PrimaryRole = primaryRole.String
	user.AuthProvider = authProvider.String
	user.AvatarURL = avatarURL.String
	return user, nil
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	if user.ID == "" {
		user.ID = uuid.New().String()
	}
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	var orgID, image, avatarURL sql.NullString
	if strings.TrimSpace(user.OrgID) != "" {
		orgID = sql.NullString{String: strings.TrimSpace(user.OrgID), Valid: true}
	}
	if strings.TrimSpace(user.Image) != "" {
		image = sql.NullString{String: strings.TrimSpace(user.Image), Valid: true}
	}
	if strings.TrimSpace(user.AvatarURL) != "" {
		avatarURL = sql.NullString{String: strings.TrimSpace(user.AvatarURL), Valid: true}
	}

	primaryRole := strings.TrimSpace(user.PrimaryRole)
	if primaryRole == "" {
		primaryRole = "developer"
	}

	authProvider := strings.TrimSpace(user.AuthProvider)
	if authProvider == "" {
		authProvider = "local"
	}

	_, err := r.db.ExecContext(ctx,
		`INSERT INTO "user" (id, name, email, email_verified, image, org_id, is_onboarded, primary_role, auth_provider, avatar_url, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		user.ID, user.Name, strings.TrimSpace(strings.ToLower(user.Email)), user.EmailVerified,
		image, orgID, user.IsOnboarded, primaryRole, authProvider, avatarURL,
		user.CreatedAt, user.UpdatedAt,
	)
	return err
}

func (r *UserRepository) UpdateProfile(ctx context.Context, user *models.User) error {
	var image, avatarURL sql.NullString
	if strings.TrimSpace(user.Image) != "" {
		image = sql.NullString{String: strings.TrimSpace(user.Image), Valid: true}
	}
	if strings.TrimSpace(user.AvatarURL) != "" {
		avatarURL = sql.NullString{String: strings.TrimSpace(user.AvatarURL), Valid: true}
	}

	_, err := r.db.ExecContext(ctx,
		`UPDATE "user" 
		 SET name = COALESCE(NULLIF($1, ''), name),
		     image = COALESCE($2, image),
		     avatar_url = COALESCE($3, avatar_url),
		     email_verified = $4,
		     updated_at = NOW()
		 WHERE id = $5`,
		user.Name, image, avatarURL, user.EmailVerified, user.ID,
	)
	return err
}

func (r *UserRepository) UpdateOnboardingStatus(ctx context.Context, userID, orgID, role string) error {
	var nullOrgID sql.NullString
	if strings.TrimSpace(orgID) != "" {
		nullOrgID = sql.NullString{String: strings.TrimSpace(orgID), Valid: true}
	}
	_, err := r.db.ExecContext(ctx,
		`UPDATE "user" SET is_onboarded = true, org_id = $1, primary_role = $2, updated_at = NOW() WHERE id = $3`,
		nullOrgID, role, userID,
	)
	return err
}
