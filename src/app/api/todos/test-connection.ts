import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Connect directly to Tibbna cloud database
const TIBBNA_DATABASE_URL = process.env.TIBBNA_DATABASE_URL || process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function getDbConnection() {
  if (!TIBBNA_DATABASE_URL) {
    throw new Error('TIBBNA_DATABASE_URL is not defined');
  }
  const postgres = (await import('postgres')).default;
  return postgres(TIBBNA_DATABASE_URL, {
    ssl: 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDbConnection();
    
    // Check if todos table exists
    const tableExists = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'todos'
      );
    `;

    console.log('Todos table exists:', tableExists[0].exists);

    if (!tableExists[0].exists) {
      // Create the todos table
      await db`
        CREATE TABLE IF NOT EXISTS todos (
          todoid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspaceid UUID NOT NULL,
          userid UUID NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          completed BOOLEAN NOT NULL DEFAULT false,
          priority VARCHAR(20) NOT NULL DEFAULT 'medium',
          duedate TIMESTAMP WITH TIME ZONE,
          createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `;

      console.log('Created todos table');

      // Create indexes
      await db`
        CREATE INDEX IF NOT EXISTS todos_workspace_idx ON todos(workspaceid);
      `;
      await db`
        CREATE INDEX IF NOT EXISTS todos_user_idx ON todos(userid);
      `;

      console.log('Created indexes for todos table');
    }

    // Test query
    const result = await db`
      SELECT COUNT(*) as count FROM todos;
    `;

    return NextResponse.json({ 
      success: true,
      tableExists: tableExists[0].exists,
      todoCount: result[0].count,
      message: 'Database connection and table check successful'
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { 
        error: 'Database test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
