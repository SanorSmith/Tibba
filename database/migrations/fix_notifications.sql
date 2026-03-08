-- Drop existing notification tables if they exist
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Now re-run the full migration
