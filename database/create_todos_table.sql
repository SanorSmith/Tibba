-- Create todos table for receptionist task management
CREATE TABLE IF NOT EXISTS todos (
    todoid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    duedate TIMESTAMP,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdby UUID,
    assignedto UUID
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_duedate ON todos(duedate);
CREATE INDEX IF NOT EXISTS idx_todos_createdat ON todos(createdat);

-- Add comments for documentation
COMMENT ON TABLE todos IS 'Task management table for receptionists';
COMMENT ON COLUMN todos.todoid IS 'Unique identifier for the todo item';
COMMENT ON COLUMN todos.title IS 'Title/summary of the task';
COMMENT ON COLUMN todos.description IS 'Detailed description of the task';
COMMENT ON COLUMN todos.priority IS 'Task priority: low, medium, or high';
COMMENT ON COLUMN todos.status IS 'Task status: pending, in_progress, or completed';
COMMENT ON COLUMN todos.duedate IS 'Due date and time for the task';
COMMENT ON COLUMN todos.createdat IS 'Timestamp when the todo was created';
COMMENT ON COLUMN todos.updatedat IS 'Timestamp when the todo was last updated';
COMMENT ON COLUMN todos.createdby IS 'User ID who created the todo';
COMMENT ON COLUMN todos.assignedto IS 'User ID to whom the todo is assigned';
