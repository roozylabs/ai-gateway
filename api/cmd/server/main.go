package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/roozylabs/ai-gateway/internal/config"
	"github.com/roozylabs/ai-gateway/internal/database"
	"github.com/roozylabs/ai-gateway/internal/handlers"
	"github.com/roozylabs/ai-gateway/internal/middleware"
	"github.com/roozylabs/ai-gateway/internal/proxy"
	goredis "github.com/roozylabs/ai-gateway/internal/redis"
	"github.com/roozylabs/ai-gateway/internal/repository"
	"github.com/roozylabs/ai-gateway/internal/service"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title           AI Gateway API
// @version         1.0
// @description     Centralized AI API Gateway
// @host            localhost:8080
// @BasePath        /api/v1

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// Run migrations
	if err := database.RunMigrations(cfg.DatabaseURL, "./migrations"); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Connect to PostgreSQL
	db, err := database.NewPostgres(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Connect to Redis
	rdb, err := database.NewRedis(cfg.RedisURL)
	if err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}
	defer rdb.Close()

	// Repositories (use underlying sql.DB from sqlx)
	sqlDB := db.DB
	userRepo := repository.NewUserRepository(sqlDB)
	sessionRepo := repository.NewSessionRepository(sqlDB)
	accountRepo := repository.NewAccountRepository(sqlDB)
	providerRepo := repository.NewProviderRepository(sqlDB)
	credentialRepo := repository.NewCredentialRepository(sqlDB)
	modelRepo := repository.NewModelRepository(sqlDB)
	gatewayKeyRepo := repository.NewGatewayKeyRepository(sqlDB)
	requestLogRepo := repository.NewRequestLogRepository(sqlDB)
	settingRepo := repository.NewSettingRepository(sqlDB)

	// Services
	authService := service.NewAuthService(userRepo, sessionRepo, accountRepo)

	// Proxy
	cooldown := goredis.NewCooldownStore(rdb)
	router := proxy.NewRouter(modelRepo, providerRepo, credentialRepo)
	engine := proxy.NewEngine(router, credentialRepo, cooldown, cfg.EncryptionKey, cfg.MaxRetries, cfg.CooldownSeconds)

	// Handlers
	healthHandler := handlers.NewHealthHandler(db, rdb)
	authHandler := handlers.NewAuthHandler(authService)
	providerHandler := handlers.NewProviderHandler(providerRepo)
	credentialHandler := handlers.NewCredentialHandler(credentialRepo, providerRepo, cfg.EncryptionKey)
	modelHandler := handlers.NewModelHandler(modelRepo, providerRepo)
	gatewayKeyHandler := handlers.NewGatewayKeyHandler(gatewayKeyRepo)
	gatewayHandler := handlers.NewGatewayHandler(engine, gatewayKeyRepo, requestLogRepo)
	logsHandler := handlers.NewLogsHandler(requestLogRepo)
	dashboardHandler := handlers.NewDashboardHandler(requestLogRepo)
	settingsHandler := handlers.NewSettingsHandler(settingRepo)

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// CORS middleware
	r.Use(middleware.CORSMiddleware())

	// Health check (public)
	r.GET("/health", healthHandler.Check)

	// Auth routes (public)
	r.POST("/api/auth/login", authHandler.Login)

	// Protected routes
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware(sessionRepo))
	{
		// Auth
		api.POST("/auth/logout", authHandler.Logout)
		api.GET("/auth/me", authHandler.Me)

		// Providers
		api.GET("/providers", providerHandler.List)
		api.POST("/providers", providerHandler.Create)
		api.GET("/providers/:id", providerHandler.Get)
		api.PUT("/providers/:id", providerHandler.Update)
		api.DELETE("/providers/:id", providerHandler.Delete)

		// Credentials (nested under provider)
		api.GET("/providers/:id/credentials", credentialHandler.List)
		api.POST("/providers/:id/credentials", credentialHandler.Create)
		api.GET("/providers/:id/credentials/:credId", credentialHandler.Get)
		api.PUT("/providers/:id/credentials/:credId", credentialHandler.Update)
		api.DELETE("/providers/:id/credentials/:credId", credentialHandler.Delete)
		api.POST("/providers/:id/credentials/:credId/test", credentialHandler.Test)

		// Models (nested under provider)
		api.GET("/providers/:id/models", modelHandler.List)
		api.POST("/providers/:id/models", modelHandler.Create)
		api.GET("/providers/:id/models/:modelId", modelHandler.Get)
		api.PUT("/providers/:id/models/:modelId", modelHandler.Update)
		api.DELETE("/providers/:id/models/:modelId", modelHandler.Delete)

		// Gateway API Keys
		api.GET("/gateway-keys", gatewayKeyHandler.List)
		api.POST("/gateway-keys", gatewayKeyHandler.Create)
		api.DELETE("/gateway-keys/:id", gatewayKeyHandler.Delete)

		// Request Logs
		api.GET("/logs", logsHandler.List)

		// Dashboard
		api.GET("/dashboard/stats", dashboardHandler.GetStats)
		api.GET("/dashboard/usage", dashboardHandler.GetUsageChart)
		api.GET("/dashboard/health", dashboardHandler.GetProviderHealth)

		// Settings
		api.GET("/settings", settingsHandler.List)
		api.PUT("/settings", settingsHandler.Update)
	}

	// Gateway routes (authenticated with gw_sk_* keys)
	v1 := r.Group("/v1")
	v1.Use(middleware.GatewayAuthMiddleware(gatewayKeyRepo))
	{
		v1.POST("/chat/completions", gatewayHandler.ChatCompletions)
		v1.GET("/models", gatewayHandler.Models)
	}

	// Swagger endpoint (dev only)
	if cfg.AppEnv != "production" {
		r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	log.Printf("Server starting on port %s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
