package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

const SharedMatrixPassword = "PrismMatrix_7x9k2m4p!"

type PlanSpec struct {
	Slug             string
	Name             string
	Tier             string
	PriceUSD         float64
	SpendCapMonthly  float64
	SpendCapDaily    float64
	DailyReqLimit    int
	MaxConcurrent    int
	MaxWorkspaces    int
	MaxProjectsPerWs int
}

var PlanSpecs = []PlanSpec{
	{
		Slug:             "free",
		Name:             "Matrix Labs Free",
		Tier:             "free",
		PriceUSD:         0.0,
		SpendCapMonthly:  50.0,
		SpendCapDaily:    5.0,
		DailyReqLimit:    10000,
		MaxConcurrent:    5,
		MaxWorkspaces:    1,
		MaxProjectsPerWs: 2,
	},
	{
		Slug:             "pro",
		Name:             "Matrix Labs Pro",
		Tier:             "pro",
		PriceUSD:         15.0,
		SpendCapMonthly:  300.0,
		SpendCapDaily:    30.0,
		DailyReqLimit:    50000,
		MaxConcurrent:    20,
		MaxWorkspaces:    3,
		MaxProjectsPerWs: 5,
	},
	{
		Slug:             "team",
		Name:             "Matrix Labs Team",
		Tier:             "team",
		PriceUSD:         49.0,
		SpendCapMonthly:  1500.0,
		SpendCapDaily:    150.0,
		DailyReqLimit:    250000,
		MaxConcurrent:    50,
		MaxWorkspaces:    10,
		MaxProjectsPerWs: 10,
	},
	{
		Slug:             "enterprise",
		Name:             "Matrix Labs Enterprise",
		Tier:             "enterprise",
		PriceUSD:         199.0,
		SpendCapMonthly:  5000.0,
		SpendCapDaily:    500.0,
		DailyReqLimit:    1000000,
		MaxConcurrent:    200,
		MaxWorkspaces:    50,
		MaxProjectsPerWs: 50,
	},
}

type RoleSpec struct {
	Slug        string
	Name        string
	Description string
	Prefix      string
}

var RoleSpecs = []RoleSpec{
	{Slug: "owner", Name: "Owner / Org Admin", Description: "Full administrative, billing, policy & member management", Prefix: "owner"},
	{Slug: "developer", Name: "Developer / AI Engineer", Description: "CRUD for API Keys, Prompts, MCP Servers, Tools, Playground & Logs", Prefix: "dev"},
	{Slug: "agent_manager", Name: "Agent Administrator", Description: "Manage AI Agent identities, model rules, tool execution & budgets", Prefix: "agent"},
	{Slug: "finops_manager", Name: "FinOps / Budget Manager", Description: "Manage spend limits, cost analysis, subscriptions & invoices", Prefix: "finops"},
	{Slug: "auditor", Name: "Security Auditor", Description: "Inspect cryptographic audit logs, compliance rules & request traces", Prefix: "auditor"},
	{Slug: "viewer", Name: "Viewer / Guest", Description: "Read-only telemetry and dashboard monitoring access", Prefix: "viewer"},
}

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/prism?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer func() { _ = db.Close() }()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		log.Printf("Warning: Database ping failed (%v). Attempting to run seed operations...", err)
	}

	if err := SeedMatrix(ctx, db); err != nil {
		log.Fatalf("Matrix seeding failed: %v", err)
	}

	PrintMatrixTable()
}

func SeedMatrix(ctx context.Context, db *sql.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	// 1. Generate bcrypt hash for shared password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(SharedMatrixPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("generate bcrypt hash: %w", err)
	}

	// 2. Iterate through all Plan Tiers
	for _, plan := range PlanSpecs {
		orgID := fmt.Sprintf("org_matrix_%s", plan.Slug)
		wsEngID := fmt.Sprintf("ws_%s_eng", plan.Slug)
		wsFinID := fmt.Sprintf("ws_%s_finance", plan.Slug)
		projEngID := fmt.Sprintf("proj_%s_eng", plan.Slug)
		projFinID := fmt.Sprintf("proj_%s_finance", plan.Slug)

		// 2a. Upsert Organization
		_, err = tx.ExecContext(ctx, `
			INSERT INTO organizations (id, name, slug, plan_tier, max_workspaces, max_projects_per_workspace, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
			ON CONFLICT (id) DO UPDATE SET
				name = EXCLUDED.name,
				plan_tier = EXCLUDED.plan_tier,
				max_workspaces = EXCLUDED.max_workspaces,
				max_projects_per_workspace = EXCLUDED.max_projects_per_workspace,
				updated_at = NOW()
		`, orgID, plan.Name, orgID, plan.Tier, plan.MaxWorkspaces, plan.MaxProjectsPerWs)
		if err != nil {
			return fmt.Errorf("upsert organization %s: %w", orgID, err)
		}

		// 2b. Upsert Workspaces
		_, err = tx.ExecContext(ctx, `
			INSERT INTO workspaces (id, org_id, name, slug, created_at, updated_at)
			VALUES
				($1, $2, $3, $4, NOW(), NOW()),
				($5, $2, $6, $7, NOW(), NOW())
			ON CONFLICT (id) DO UPDATE SET
				name = EXCLUDED.name,
				updated_at = NOW()
		`, wsEngID, orgID, fmt.Sprintf("%s Engineering", plan.Name), wsEngID,
			wsFinID, fmt.Sprintf("%s Finance & Ops", plan.Name), wsFinID)
		if err != nil {
			return fmt.Errorf("upsert workspaces for %s: %w", orgID, err)
		}

		// 2c. Upsert Projects
		_, err = tx.ExecContext(ctx, `
			INSERT INTO projects (id, workspace_id, name, slug, created_at, updated_at)
			VALUES
				($1, $2, 'AI Core Services', $1, NOW(), NOW()),
				($3, $4, 'FinOps & Invoicing', $3, NOW(), NOW())
			ON CONFLICT (id) DO UPDATE SET
				name = EXCLUDED.name,
				updated_at = NOW()
		`, projEngID, wsEngID, projFinID, wsFinID)
		if err != nil {
			return fmt.Errorf("upsert projects for %s: %w", orgID, err)
		}

		// 2d. Upsert Quota for Organization
		quotaID := fmt.Sprintf("quota_matrix_%s", plan.Slug)
		_, err = tx.ExecContext(ctx, `
			INSERT INTO tenant_quotas (id, organization_id, target_type, target_id, monthly_spend_limit_usd, daily_spend_limit_usd, daily_request_limit, max_concurrent_streams, created_at, updated_at)
			VALUES ($1, $2, 'organization', $2, $3, $4, $5, $6, NOW(), NOW())
			ON CONFLICT (target_type, target_id) DO UPDATE SET
				monthly_spend_limit_usd = EXCLUDED.monthly_spend_limit_usd,
				daily_spend_limit_usd = EXCLUDED.daily_spend_limit_usd,
				daily_request_limit = EXCLUDED.daily_request_limit,
				max_concurrent_streams = EXCLUDED.max_concurrent_streams,
				updated_at = NOW()
		`, quotaID, orgID, plan.SpendCapMonthly, plan.SpendCapDaily, plan.DailyReqLimit, plan.MaxConcurrent)
		if err != nil {
			return fmt.Errorf("upsert quota for %s: %w", orgID, err)
		}

		// 2e. Seed 6 Users per Organization (Total 24 Matrix Users)
		for _, role := range RoleSpecs {
			userID := fmt.Sprintf("usr_%s_%s", role.Prefix, plan.Slug)
			email := fmt.Sprintf("%s.%s@prism.local", role.Prefix, plan.Slug)
			name := fmt.Sprintf("%s (%s Tier)", role.Name, strings.ToUpper(plan.Slug))
			memberID := fmt.Sprintf("mem_%s_%s", role.Prefix, plan.Slug)
			accountID := fmt.Sprintf("acc_%s_%s", role.Prefix, plan.Slug)

			// Insert / update "user" table
			_, err = tx.ExecContext(ctx, `
				INSERT INTO "user" (id, name, email, email_verified, is_onboarded, primary_role, auth_provider, org_id, created_at, updated_at)
				VALUES ($1, $2, $3, true, true, $4, 'credential', $5, NOW(), NOW())
				ON CONFLICT (id) DO UPDATE SET
					name = EXCLUDED.name,
					email = EXCLUDED.email,
					org_id = EXCLUDED.org_id,
					primary_role = EXCLUDED.primary_role,
					is_onboarded = true,
					updated_at = NOW()
			`, userID, name, email, role.Slug, orgID)
			if err != nil {
				return fmt.Errorf("upsert user %s: %w", email, err)
			}

			// Insert / update "account" table with password hash
			_, err = tx.ExecContext(ctx, `
				INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
				VALUES ($1, $2, 'credential', $3, $4, NOW(), NOW())
				ON CONFLICT (id) DO UPDATE SET
					password = EXCLUDED.password,
					updated_at = NOW()
			`, accountID, email, userID, string(passwordHash))
			if err != nil {
				return fmt.Errorf("upsert account %s: %w", email, err)
			}

			// Insert / update "organization_members" linking role_id dynamically
			_, err = tx.ExecContext(ctx, `
				INSERT INTO organization_members (id, org_id, user_id, role, role_id, created_at, updated_at)
				VALUES (
					$1, $2, $3, $4,
					COALESCE((SELECT id FROM roles WHERE slug = $4 AND is_system = true LIMIT 1), '00000000-0000-0000-0000-000000000001'::uuid),
					NOW(), NOW()
				)
				ON CONFLICT (org_id, user_id) DO UPDATE SET
					role = EXCLUDED.role,
					role_id = EXCLUDED.role_id,
					updated_at = NOW()
			`, memberID, orgID, userID, role.Slug)
			if err != nil {
				return fmt.Errorf("upsert org member %s (%s): %w", email, role.Slug, err)
			}

			// Insert workspace memberships:
			// - owner: member of engineering ws (and has workspace:admin for all ws)
			// - developer & agent_manager: members of wsEngID
			// - finops_manager: member of wsFinID
			// - auditor & viewer: members of wsEngID
			targetWsID := wsEngID
			if role.Slug == "finops_manager" {
				targetWsID = wsFinID
			}

			wsMemberID := fmt.Sprintf("wm_%s_%s", role.Prefix, plan.Slug)
			_, err = tx.ExecContext(ctx, `
				INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
				VALUES ($1, $2, $3, $4, NOW(), NOW())
				ON CONFLICT (workspace_id, user_id) DO UPDATE SET
					role = EXCLUDED.role,
					updated_at = NOW()
			`, wsMemberID, targetWsID, userID, role.Slug)
			if err != nil {
				return fmt.Errorf("upsert workspace member %s (%s): %w", email, targetWsID, err)
			}
		}
	}

	return tx.Commit()
}

func PrintMatrixTable() {
	fmt.Println("\n========================================================================================================================")
	fmt.Println("                           ROOZYLABS PRISM — MULTI-ROLE & MULTI-PLAN TEST MATRIX SEEDED                                ")
	fmt.Println("========================================================================================================================")
	fmt.Printf("Shared Password across all 24 dummy matrix accounts: %s\n\n", SharedMatrixPassword)

	fmt.Printf("%-12s | %-16s | %-32s | %-24s | %-12s\n", "PLAN TIER", "ROLE", "LOGIN EMAIL", "ORGANIZATION ID", "SPEND CAP")
	fmt.Println("------------------------------------------------------------------------------------------------------------------------")

	for _, plan := range PlanSpecs {
		for _, role := range RoleSpecs {
			email := fmt.Sprintf("%s.%s@prism.local", role.Prefix, plan.Slug)
			orgID := fmt.Sprintf("org_matrix_%s", plan.Slug)
			spend := fmt.Sprintf("$%.2f/mo", plan.SpendCapMonthly)
			fmt.Printf("%-12s | %-16s | %-32s | %-24s | %-12s\n",
				strings.ToUpper(plan.Slug), role.Slug, email, orgID, spend)
		}
		fmt.Println("------------------------------------------------------------------------------------------------------------------------")
	}

	fmt.Println("Test Login Endpoint: POST /api/auth/login")
	fmt.Println("Example Payload:     {\"email\": \"dev.pro@prism.local\", \"password\": \"" + SharedMatrixPassword + "\"}")
	fmt.Println("========================================================================================================================")
}
