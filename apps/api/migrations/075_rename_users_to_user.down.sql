-- Migration 075 Down: Revert '"user"' table rename to 'users'

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        ALTER TABLE "user" RENAME TO users;
    END IF;
END $$;
