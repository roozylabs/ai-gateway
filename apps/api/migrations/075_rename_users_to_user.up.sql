-- Migration 075: Harmonize legacy 'users' table name with singular '"user"' schema

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user'
    ) THEN
        ALTER TABLE users RENAME TO "user";
    END IF;
END $$;

-- Ensure all columns required by Better Auth and Prism models are present on "user"
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS org_id VARCHAR(64);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS primary_role TEXT DEFAULT 'developer';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Synchronize image and avatar_url if either is populated
UPDATE "user" SET image = avatar_url WHERE image IS NULL AND avatar_url IS NOT NULL;
UPDATE "user" SET avatar_url = image WHERE avatar_url IS NULL AND image IS NOT NULL;
