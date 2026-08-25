package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/roozylabs/prism/internal/models"
)

type SessionRepository struct {
	db *sql.DB
}

func NewSessionRepository(db *sql.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

func (r *SessionRepository) Create(ctx context.Context, session *models.Session) error {
	session.CreatedAt = time.Now()
	session.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO session (id, "expiresAt", token, "ipAddress", "userAgent", "userId", "createdAt", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		session.ID, session.ExpiresAt, session.Token,
		session.IPAddress, session.UserAgent, session.UserID,
		session.CreatedAt, session.UpdatedAt,
	)
	return err
}

func (r *SessionRepository) FindByToken(ctx context.Context, token string) (*models.Session, error) {
	session := &models.Session{}
	var ipAddress, userAgent sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, "expiresAt", token, "ipAddress", "userAgent", "userId", "createdAt", "updatedAt"
		 FROM session WHERE token = $1`, token,
	).Scan(&session.ID, &session.ExpiresAt, &session.Token,
		&ipAddress, &userAgent, &session.UserID,
		&session.CreatedAt, &session.UpdatedAt)
	if err != nil {
		return nil, err
	}
	session.IPAddress = ipAddress.String
	session.UserAgent = userAgent.String
	return session, nil
}

func (r *SessionRepository) FindValidByToken(ctx context.Context, token string) (*models.Session, error) {
	session := &models.Session{}
	var ipAddress, userAgent sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, "expiresAt", token, "ipAddress", "userAgent", "userId", "createdAt", "updatedAt"
		 FROM session WHERE token = $1 AND "expiresAt" > NOW()`, token,
	).Scan(&session.ID, &session.ExpiresAt, &session.Token,
		&ipAddress, &userAgent, &session.UserID,
		&session.CreatedAt, &session.UpdatedAt)
	if err != nil {
		return nil, err
	}
	session.IPAddress = ipAddress.String
	session.UserAgent = userAgent.String
	return session, nil
}

func (r *SessionRepository) Delete(ctx context.Context, token string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM session WHERE token = $1`, token)
	return err
}

func (r *SessionRepository) DeleteExpired(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM session WHERE "expiresAt" < NOW()`)
	return err
}
