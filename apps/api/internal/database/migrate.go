package database

import (
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunMigrations(databaseURL, migrationsPath string) error {
	m, err := migrate.New(
		fmt.Sprintf("file://%s", migrationsPath),
		databaseURL,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}
	defer func() { _, _ = m.Close() }()

	// Auto-clear dirty database version if interrupted previously
	if version, dirty, verErr := m.Version(); verErr == nil && dirty {
		log.Printf("Warning: Database schema migration is dirty at version %d. Forcing version %d to clear dirty state...", version, version)
		if forceErr := m.Force(int(version)); forceErr != nil {
			log.Printf("Warning: Failed to force migration version %d: %v", version, forceErr)
		}
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Printf("Warning: Migration up returned error: %v. Retrying after force reset...", err)
		if version, _, verErr := m.Version(); verErr == nil {
			_ = m.Force(int(version))
			if retryErr := m.Up(); retryErr != nil && retryErr != migrate.ErrNoChange {
				return fmt.Errorf("failed to run migrations after force reset: %w", retryErr)
			}
		} else {
			return fmt.Errorf("failed to run migrations: %w", err)
		}
	}

	log.Println("Migrations completed successfully")
	return nil
}
