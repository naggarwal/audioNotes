-- Create profiles table for user profile information
-- Migration: 20240601000000_create_profiles_table.sql

-- Up Migration
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create a policy that only allows users to view their own profile
CREATE POLICY "Users can view own profile" 
    ON profiles 
    FOR SELECT
    USING (auth.uid() = id);

-- Create a policy that only allows users to update their own profile
CREATE POLICY "Users can update own profile" 
    ON profiles 
    FOR UPDATE
    USING (auth.uid() = id);

-- Create a policy that only allows users to insert their own profile
CREATE POLICY "Users can insert own profile" 
    ON profiles 
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();

-- Down Migration (Rollback)
-- Note: Comment out the entire block below when running the migration
-- Uncomment and run to rollback the migration
/*
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP FUNCTION IF EXISTS update_profiles_updated_at();
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP TABLE IF EXISTS profiles;
*/ 