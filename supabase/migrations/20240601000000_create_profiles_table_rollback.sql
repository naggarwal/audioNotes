-- Rollback migration for profiles table
-- Migration: 20240601000000_create_profiles_table_rollback.sql

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP FUNCTION IF EXISTS update_profiles_updated_at();
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP TABLE IF EXISTS profiles; 