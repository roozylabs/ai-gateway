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
	_, _ = sqlDB.Exec("UPDATE credentials SET status = 'active' WHERE status = 'rate_limited'")

	userRepo := repository.NewUserRepository(sqlDB)
	sessionRepo := repository.NewSessionRepository(sqlDB)
	accountRepo := repository.NewAccountRepository(sqlDB)
	providerRepo := repository.NewProviderRepository(sqlDB)
	credentialRepo := repository.NewCredentialRepository(sqlDB)
	modelRepo := repository.NewModelRepository(sqlDB)
	gatewayKeyRepo := repository.NewGatewayKeyRepository(sqlDB)
	requestLogRepo := repository.NewRequestLogRepository(sqlDB)
	settingRepo := repository.NewSettingRepository(sqlDB)
	pricingRepo := repository.NewModelPricingRepository(sqlDB)
	routingRuleRepo := repository.NewRoutingRuleRepository(sqlDB)
	routingPolicyRepo := repository.NewRoutingPolicyRepository(sqlDB)
	budgetRepo := repository.NewBudgetRepository(sqlDB)
	decisionRepo := repository.NewRoutingDecisionRepository(sqlDB)

	// Services
	authService := service.NewAuthService(userRepo, sessionRepo, accountRepo)

	// Event system
	eventPublisher := goredis.NewEventPublisher(rdb)

	// Proxy
	cooldown := goredis.NewCooldownStore(rdb)
	budgetMgr := proxy.NewBudgetManager(budgetRepo)
	router := proxy.NewRouter(modelRepo, providerRepo, credentialRepo, settingRepo)
	engine := proxy.NewEngine(router, credentialRepo, cooldown, eventPublisher, cfg.EncryptionKey, cfg.MaxRetries, cfg.CooldownSeconds, budgetMgr, routingPolicyRepo, decisionRepo)

	// Handlers
	healthHandler := handlers.NewHealthHandler(db, rdb)
	authHandler := handlers.NewAuthHandler(authService)
	providerHandler := handlers.NewProviderHandler(providerRepo, gatewayKeyRepo)
	credentialHandler := handlers.NewCredentialHandler(credentialRepo, providerRepo, gatewayKeyRepo, cooldown, eventPublisher, cfg.EncryptionKey)
	modelHandler := handlers.NewModelHandler(modelRepo, providerRepo, gatewayKeyRepo, cooldown)
	gatewayKeyHandler := handlers.NewGatewayKeyHandler(gatewayKeyRepo, credentialRepo)
	gatewayHandler := handlers.NewGatewayHandler(engine, gatewayKeyRepo, requestLogRepo, eventPublisher, pricingRepo)
	logsHandler := handlers.NewLogsHandler(requestLogRepo)
	dashboardHandler := handlers.NewDashboardHandler(requestLogRepo)
	activeStreamsHandler := handlers.NewActiveStreamsHandler(cooldown)
	settingsHandler := handlers.NewSettingsHandler(settingRepo)
	sseHandler := handlers.NewSSEHandler(eventPublisher)
	googleOAuthHandler := handlers.NewGoogleOAuthHandler(credentialRepo, providerRepo, cfg.EncryptionKey)
	routingRuleHandler := handlers.NewRoutingRuleHandler(routingRuleRepo)
	routingPolicyHandler := handlers.NewRoutingPolicyHandler(routingPolicyRepo)
	budgetHandler := handlers.NewBudgetHandler(budgetRepo)
	budgetStatusHandler := handlers.NewBudgetStatusHandler(budgetMgr)
	routingDecisionHandler := handlers.NewRoutingDecisionHandler(decisionRepo)

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
		api.GET("/auth/google/login", googleOAuthHandler.Login)
		api.GET("/auth/google/callback", googleOAuthHandler.Callback)

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

			// Credentials (nested under provider & top-level)
			protected.GET("/credentials", credentialHandler.List)
			protected.GET("/providers/:id/credentials", credentialHandler.List)
			protected.POST("/providers/:id/credentials", credentialHandler.Create)
			protected.GET("/providers/:id/credentials/:credId", credentialHandler.Get)
			protected.PUT("/providers/:id/credentials/:credId", credentialHandler.Update)
			protected.DELETE("/providers/:id/credentials/:credId", credentialHandler.Delete)
			protected.DELETE("/credentials/:credId", credentialHandler.Delete)
			protected.POST("/providers/:id/credentials/:credId/test", credentialHandler.Test)
			protected.POST("/providers/:id/credentials/:credId/reveal", credentialHandler.Reveal)
			protected.POST("/providers/:id/credentials/:credId/reset-cooldown", credentialHandler.ResetCooldown)
			protected.POST("/credentials/:credId/reset-cooldown", credentialHandler.ResetCooldown)

			// Models (nested under provider & top-level)
			protected.GET("/models", modelHandler.List)
			protected.GET("/providers/:id/models", modelHandler.List)
			protected.POST("/providers/:id/models", modelHandler.Create)
			protected.GET("/providers/:id/models/:modelId", modelHandler.Get)
			protected.PUT("/providers/:id/models/:modelId", modelHandler.Update)
			protected.PATCH("/providers/:id/models/:modelId/capabilities", modelHandler.UpdateCapabilities)
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
			protected.GET("/dashboard/active-streams", activeStreamsHandler.GetActiveStreams)

			// Settings
			protected.GET("/settings", settingsHandler.List)
			protected.PUT("/settings", settingsHandler.Update)

			// SSE
			protected.GET("/sse", sseHandler.Stream)

			// Routing Rules
			protected.GET("/routing-rules", routingRuleHandler.List)
			protected.GET("/routing-rules/:id", routingRuleHandler.Get)
			protected.POST("/routing-rules", routingRuleHandler.Create)
			protected.PUT("/routing-rules/:id", routingRuleHandler.Update)
			protected.DELETE("/routing-rules/:id", routingRuleHandler.Delete)

			// Routing Policies (with aliases for /policies and /routing/policies)
			protected.GET("/routing-policies", routingPolicyHandler.List)
			protected.GET("/routing-policies/:id", routingPolicyHandler.Get)
			protected.POST("/routing-policies", routingPolicyHandler.Create)
			protected.PUT("/routing-policies/:id", routingPolicyHandler.Update)
			protected.DELETE("/routing-policies/:id", routingPolicyHandler.Delete)

			protected.GET("/policies", routingPolicyHandler.List)
			protected.GET("/policies/:id", routingPolicyHandler.Get)
			protected.POST("/policies", routingPolicyHandler.Create)
			protected.PUT("/policies/:id", routingPolicyHandler.Update)
			protected.DELETE("/policies/:id", routingPolicyHandler.Delete)

			protected.GET("/routing/policies", routingPolicyHandler.List)
			protected.POST("/routing/policies", routingPolicyHandler.Create)
			protected.PUT("/routing/policies/:id", routingPolicyHandler.Update)
			protected.DELETE("/routing/policies/:id", routingPolicyHandler.Delete)

			// Routing Decisions Audit Logs
			protected.GET("/routing/decisions", routingDecisionHandler.List)
			protected.GET("/routing-decisions", routingDecisionHandler.List)

			// Budgets
			protected.GET("/budgets", budgetHandler.List)
			protected.GET("/budgets/status", budgetStatusHandler.GetStatus)
			protected.GET("/budgets/:id", budgetHandler.Get)
			protected.POST("/budgets", budgetHandler.Create)
			protected.PUT("/budgets/:id", budgetHandler.Update)
			protected.DELETE("/budgets/:id", budgetHandler.Delete)
			
			// Sandbox
			protected.POST("/sandbox/chat/completions", gatewayHandler.SandboxChatCompletions)
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
