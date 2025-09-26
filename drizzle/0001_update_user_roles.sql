-- Update user roles: user -> member, add system role
-- =============================================

-- First, update existing 'user' roles to 'member'
UPDATE users SET role = 'member' WHERE role = 'user';

-- Add the new 'system' role to the enum
ALTER TYPE "public"."user_role" ADD VALUE 'system';

-- Update the default value for new users
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'member';
