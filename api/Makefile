.PHONY: run build swagger test clean docker-up docker-down docker-build lint

# Run the application locally
run:
	go run cmd/server/main.go

# Build the application
build:
	go build -o bin/server cmd/server/main.go

# Generate Swagger docs
swagger:
	swag init --parseDependency --parseInternal

# Run tests
test:
	go test ./... -v

# Clean build artifacts
clean:
	rm -rf bin/

# Run with Swagger
swagger-run: swagger
	go run cmd/server/main.go

# Docker commands
docker-up:
	cd .. && docker compose up -d

docker-down:
	cd .. && docker compose down

docker-build:
	cd .. && docker compose up -d --build

# Database migrations
migrate-up:
	go run cmd/server/main.go

# Lint
lint:
	golangci-lint run
