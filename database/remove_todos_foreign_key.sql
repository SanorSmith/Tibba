-- Remove foreign key constraint from todos table to allow any userid
-- This allows the todo app to work without requiring users to exist in the users table

-- Drop the foreign key constraint on userid
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_userid_users_userid_fk;

-- Drop the foreign key constraint on workspaceid if it exists
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_workspaceid_workspaces_workspaceid_fk;

-- Verify constraints are removed
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'todos'::regclass;
