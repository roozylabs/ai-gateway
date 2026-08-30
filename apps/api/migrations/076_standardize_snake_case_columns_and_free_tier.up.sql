-- Migration 076: Standardize all table columns to snake_case and set organization default plan tier to 'free'

-- 1. Table "user": Rename camelCase columns to snake_case
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'emailVerified'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE "user" RENAME COLUMN "emailVerified" TO email_verified;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'createdAt'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE "user" RENAME COLUMN "createdAt" TO created_at;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'updatedAt'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE "user" RENAME COLUMN "updatedAt" TO updated_at;
    END IF;
END $$;

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS org_id VARCHAR(64);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS primary_role TEXT DEFAULT 'developer';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Table account: Rename camelCase columns to snake_case
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'account' AND column_name = 'accountId'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'account' AND column_name = 'account_id'
    ) THEN
        ALTER TABLE account RENAME COLUMN "accountId" TO account_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'account' AND column_name = 'providerId'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'account' AND column_name = 'provider_id'
    ) THEN
        ALTER TABLE account RENAME COLUMN "providerId" TO provider_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'account' AND column_name = 'userId'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'account' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE account RENAME COLUMN "userId" TO user_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'account' AND column_name = 'createdAt'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'account' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE account RENAME COLUMN "createdAt" TO created_at;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'account' AND column_name = 'updatedAt'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'account' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE account RENAME COLUMN "updatedAt" TO updated_at;
    END IF;
END $$;

ALTER TABLE account ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE account ADD COLUMN IF NOT EXISTS provider_id TEXT;
ALTER TABLE account ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE account ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE account ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Table session: Rename camelCase columns to snake_case
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session' AND column_name = 'expiresAt'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE session RENAME COLUMN "expiresAt" TO expires_at;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session' AND column_name = 'ipAddress'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session' AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE session RENAME COLUMN "ipAddress" TO ip_address;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session' AND column_name = 'userAgent'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session' AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE session RENAME COLUMN "userAgent" TO user_agent;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session' AND column_name = 'userId'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE session RENAME COLUMN "userId" TO user_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session' AND column_name = 'createdAt'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE session RENAME COLUMN "createdAt" TO created_at;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session' AND column_name = 'updatedAt'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE session RENAME COLUMN "updatedAt" TO updated_at;
    END IF;
END $$;

ALTER TABLE session ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE session ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE session ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE session ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE session ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE session ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Table verification: Rename camelCase columns to snake_case
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'verification' AND column_name = 'expiresAt'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'verification' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE verification RENAME COLUMN "expiresAt" TO expires_at;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'verification' AND column_name = 'createdAt'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'verification' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE verification RENAME COLUMN "createdAt" TO created_at;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'verification' AND column_name = 'updatedAt'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'verification' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE verification RENAME COLUMN "updatedAt" TO updated_at;
    END IF;
END $$;

-- 5. Standardize organizations default plan_tier to 'free'
ALTER TABLE organizations ALTER COLUMN plan_tier SET DEFAULT 'free';
