package database

import (
	"errors"
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
	defer m.Close()

	// Check if database is currently dirty before running Up()
	version, dirty, verErr := m.Version()
	if verErr == nil && dirty {
		log.Printf("Detected dirty migration database at version %d, clearing dirty flag...", version)
		if forceErr := m.Force(int(version)); forceErr != nil {
			log.Printf("Warning: failed to force version %d: %v", version, forceErr)
		}
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		var dirtyErr migrate.ErrDirty
		if errors.As(err, &dirtyErr) {
			log.Printf("Migration database dirty at version %d, forcing version reset...", dirtyErr.Version)
			if forceErr := m.Force(dirtyErr.Version); forceErr == nil {
				if retryErr := m.Up(); retryErr == nil || retryErr == migrate.ErrNoChange {
					log.Println("Migrations completed successfully after forcing dirty reset")
					return nil
				}
			}
		}
		if v, d, ve := m.Version(); ve == nil && d {
			_ = m.Force(int(v))
			if retryErr := m.Up(); retryErr == nil || retryErr == migrate.ErrNoChange {
				log.Println("Migrations completed successfully after second force attempt")
				return nil
			}
		}
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Migrations completed successfully")
	return nil
}
