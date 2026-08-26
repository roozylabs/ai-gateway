package models

// Provider types
const (
	ProviderTypeOpenAI     = "openai"
	ProviderTypeAnthropic  = "anthropic"
	ProviderTypeGoogle     = "google"
	ProviderTypeOpenRouter = "openrouter"
	ProviderTypeOpenCode   = "opencode"
	ProviderTypeGroq       = "groq"
	ProviderTypeDeepSeek   = "deepseek"
)

// Auth types
const (
	AuthTypeAPIKey            = "api_key"
	AuthTypeGCPUserOAuth      = "gcp_user_oauth"
	AuthTypeGCPServiceAccount = "gcp_service_account"
	AuthTypeAzureOAuth        = "azure_oauth"
	AuthTypeAWSIAM            = "aws_iam"
	AuthTypeGitHubOAuth       = "github_oauth"
)

// Routing strategies
const (
	RoutingStrategyRoundRobin = "round_robin"
	RoutingStrategyLRU        = "lru"
	RoutingStrategyFallback   = "fallback"
)

// Credential statuses
const (
	CredentialStatusHealthy     = "healthy"
	CredentialStatusDegraded    = "degraded"
	CredentialStatusCooldown    = "cooldown"
	CredentialStatusExhausted   = "exhausted"
	CredentialStatusActive      = "active"
	CredentialStatusRateLimited = "rate_limited"
	CredentialStatusInvalid     = "invalid"
	CredentialStatusDisabled    = "disabled"
)

// Setting categories
const (
	SettingCategoryGeneral  = "general"
	SettingCategorySecurity = "security"
	SettingCategoryRouting  = "routing"
	SettingCategoryBilling  = "billing"
	SettingCategoryCurrency = "currency"
)
