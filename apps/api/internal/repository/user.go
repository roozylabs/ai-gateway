package repository

import (
	"context"
	"database/sql"
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
	var image sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, email, "emailVerified", image, "createdAt", "updatedAt"
		 FROM "user" WHERE email = $1`, email,
	).Scan(&user.ID, &user.Name, &user.Email, &user.EmailVerified,
		&image, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	user.Image = image.String
	return user, nil
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	user := &models.User{}
	var image sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, email, "emailVerified", image, "createdAt", "updatedAt"
		 FROM "user" WHERE id = $1`, id,
	).Scan(&user.ID, &user.Name, &user.Email, &user.EmailVerified,
		&image, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	user.Image = image.String
	return user, nil
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		user.ID, user.Name, user.Email, user.EmailVerified,
		user.Image, user.CreatedAt, user.UpdatedAt,
	)
	return err
}
