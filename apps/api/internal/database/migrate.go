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

	// Auto-recover dirty database version if interrupted previously:
	// Reset dirty pointer to version-1 so m.Up() will actually re-run and complete the failed migration.
	if version, dirty, verErr := m.Version(); verErr == nil && dirty {
		targetVersion := int(version) - 1
		if targetVersion < 0 {
			targetVersion = 0
		}
		log.Printf("Warning: Database schema migration is dirty at version %d. Forcing version to %d to allow clean retry...", version, targetVersion)
		if forceErr := m.Force(targetVersion); forceErr != nil {
			log.Printf("Warning: Failed to force migration version %d: %v", targetVersion, forceErr)
		}
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Migrations completed successfully")
	return nil
}
