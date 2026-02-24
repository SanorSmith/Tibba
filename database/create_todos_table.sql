-- Create todos table matching the exact Tibbna structure
CREATE TABLE IF NOT EXISTS todos (
    todoid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspaceid UUID NOT NULL,
    userid VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    duedate TIMESTAMP WITH TIME ZONE,
    createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance (matching Tibbna structure)
CREATE INDEX IF NOT EXISTS todos_workspace_idx ON todos(workspaceid);
CREATE INDEX IF NOT EXISTS todos_user_idx ON todos(userid);

-- Add foreign key constraints if the tables exist
-- These will be ignored if the referenced tables don't exist yet
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspaces') THEN
        ALTER TABLE todos ADD CONSTRAINT fk_todos_workspace 
            FOREIGN KEY (workspaceid) REFERENCES workspaces(workspaceid) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE todos ADD CONSTRAINT fk_todos_user 
            FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE todos IS 'Task management table for users in workspaces';
COMMENT ON COLUMN todos.todoid IS 'Unique identifier for the todo item';
COMMENT ON COLUMN todos.workspaceid IS 'Workspace identifier';
COMMENT ON COLUMN todos.userid IS 'User identifier who owns the todo';
COMMENT ON COLUMN todos.title IS 'Title/summary of the task';
COMMENT ON COLUMN todos.description IS 'Detailed description of the task';
COMMENT ON COLUMN todos.completed IS 'Whether the todo is completed';
COMMENT ON COLUMN todos.priority IS 'Task priority: low, medium, or high';
COMMENT ON COLUMN todos.duedate IS 'Due date and time for the task';
COMMENT ON COLUMN todos.createdat IS 'Timestamp when the todo was created';
COMMENT ON COLUMN todos.updatedat IS 'Timestamp when the todo was last updated';
