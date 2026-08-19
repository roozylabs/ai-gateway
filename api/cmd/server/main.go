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

	// Event system
	eventPublisher := goredis.NewEventPublisher(rdb)

	// Proxy
	cooldown := goredis.NewCooldownStore(rdb)
	router := proxy.NewRouter(modelRepo, providerRepo, credentialRepo, settingRepo)
	engine := proxy.NewEngine(router, credentialRepo, cooldown, cfg.EncryptionKey, cfg.MaxRetries, cfg.CooldownSeconds)

	// Handlers
	healthHandler := handlers.NewHealthHandler(db, rdb)
	authHandler := handlers.NewAuthHandler(authService)
	providerHandler := handlers.NewProviderHandler(providerRepo)
	credentialHandler := handlers.NewCredentialHandler(credentialRepo, providerRepo, cfg.EncryptionKey)
	modelHandler := handlers.NewModelHandler(modelRepo, providerRepo)
	gatewayKeyHandler := handlers.NewGatewayKeyHandler(gatewayKeyRepo)
	gatewayHandler := handlers.NewGatewayHandler(engine, gatewayKeyRepo, requestLogRepo, eventPublisher)
	logsHandler := handlers.NewLogsHandler(requestLogRepo)
	dashboardHandler := handlers.NewDashboardHandler(requestLogRepo)
	settingsHandler := handlers.NewSettingsHandler(settingRepo)
	sseHandler := handlers.NewSSEHandler(eventPublisher)

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// CORS middleware
	r.Use(middleware.CORSMiddleware())

	// Health check (public)
	r.GET("/health", healthHandler.Check)

	// API routes group
	api := r.Group("/api")
	{
		// Public API routes
		api.GET("/health", healthHandler.Check)
		api.POST("/auth/login", authHandler.Login)

		// Protected API routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(sessionRepo))
		{
			// Auth
			protected.POST("/auth/logout", authHandler.Logout)
			protected.GET("/auth/me", authHandler.Me)

			// Providers
			protected.GET("/providers", providerHandler.List)
			protected.POST("/providers", providerHandler.Create)
			protected.GET("/providers/:id", providerHandler.Get)
			protected.PUT("/providers/:id", providerHandler.Update)
			protected.DELETE("/providers/:id", providerHandler.Delete)

			// Credentials (nested under provider)
			protected.GET("/providers/:id/credentials", credentialHandler.List)
			protected.POST("/providers/:id/credentials", credentialHandler.Create)
			protected.GET("/providers/:id/credentials/:credId", credentialHandler.Get)
			protected.PUT("/providers/:id/credentials/:credId", credentialHandler.Update)
			protected.DELETE("/providers/:id/credentials/:credId", credentialHandler.Delete)
			protected.POST("/providers/:id/credentials/:credId/test", credentialHandler.Test)

			// Models (nested under provider)
			protected.GET("/providers/:id/models", modelHandler.List)
			protected.POST("/providers/:id/models", modelHandler.Create)
			protected.GET("/providers/:id/models/:modelId", modelHandler.Get)
			protected.PUT("/providers/:id/models/:modelId", modelHandler.Update)
			protected.DELETE("/providers/:id/models/:modelId", modelHandler.Delete)

			// Gateway API Keys
			protected.GET("/gateway-keys", gatewayKeyHandler.List)
			protected.POST("/gateway-keys", gatewayKeyHandler.Create)
			protected.DELETE("/gateway-keys/:id", gatewayKeyHandler.Delete)

			// Request Logs
			protected.GET("/logs", logsHandler.List)

			// Dashboard
			protected.GET("/dashboard/stats", dashboardHandler.GetStats)
			protected.GET("/dashboard/usage", dashboardHandler.GetUsageChart)
			protected.GET("/dashboard/health", dashboardHandler.GetProviderHealth)

			// Settings
			protected.GET("/settings", settingsHandler.List)
			protected.PUT("/settings", settingsHandler.Update)

			// SSE
			protected.GET("/sse", sseHandler.Stream)
		}
	}

	// Gateway routes (authenticated with gw_sk_* keys) - accessible at /v1 and /api/v1
	registerGatewayRoutes := func(rg *gin.RouterGroup) {
		rg.Use(middleware.GatewayAuthMiddleware(gatewayKeyRepo))
		rg.Use(middleware.GatewayRateLimitMiddleware(rdb, cfg.RateLimitPerKey))
		rg.POST("/chat/completions", gatewayHandler.ChatCompletions)
		rg.GET("/models", gatewayHandler.Models)
	}

	registerGatewayRoutes(r.Group("/v1"))
	registerGatewayRoutes(api.Group("/v1"))

	// Swagger endpoint (dev only)
	if cfg.AppEnv != "production" {
		r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	log.Printf("Server starting on port %s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
