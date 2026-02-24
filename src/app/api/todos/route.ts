import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Connect directly to Tibbna cloud database
const TIBBNA_DATABASE_URL = process.env.TIBBNA_DATABASE_URL || process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Singleton connection for serverless
let postgres: any;
let sql: any;

async function getDbConnection() {
  if (!TIBBNA_DATABASE_URL) {
    throw new Error('TIBBNA_DATABASE_URL is not defined');
  }
  if (!postgres) {
    postgres = (await import('postgres')).default;
    sql = postgres(TIBBNA_DATABASE_URL, {
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}

// GET - Fetch all todos for current user
export async function GET(request: NextRequest) {
  try {
    console.log('Starting GET request for todos...');
    
    const searchParams = request.nextUrl.searchParams;
    const workspaceid = searchParams.get('workspaceid') || 'fa9fb036-a7eb-49af-890c-54406dad139d';
    // Use a proper UUID for the current receptionist user
    const userid = searchParams.get('userid') || '00000000-0000-0000-0000-000000000001';

    console.log('Fetching todos for workspace:', workspaceid, 'user:', userid);

    // First, check if we can connect to database
    try {
      const db = await getDbConnection();
      console.log('Database connection successful');
      
      // Check if table exists
      const tableCheck = await db`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'todos'
        );
      `;
      
      console.log('Table exists check:', tableCheck[0].exists);
      
      if (!tableCheck[0].exists) {
        console.log('Creating todos table...');
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
        
        await db`
          CREATE INDEX IF NOT EXISTS todos_workspace_idx ON todos(workspaceid);
        `;
        await db`
          CREATE INDEX IF NOT EXISTS todos_user_idx ON todos(userid);
        `;
        
        console.log('Todos table created successfully');
      }

      // Now fetch todos
      const todos = await db`
        SELECT 
          todoid,
          workspaceid,
          userid,
          title,
          description,
          completed,
          priority,
          duedate,
          createdat,
          updatedat
        FROM todos
        WHERE workspaceid = ${workspaceid} AND userid = ${userid}
        ORDER BY createdat DESC
      `;

      console.log(`Found ${todos.length} todos for user ${userid}`);

      return NextResponse.json({ 
        todos,
        count: todos.length 
      });
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error',
          todos: [],
          count: 0
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('General error fetching todos:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch todos',
        details: error instanceof Error ? error.message : 'Unknown error',
        todos: [],
        count: 0
      },
      { status: 500 }
    );
  }
}

// POST - Create new todo
export async function POST(request: NextRequest) {
  try {
    console.log('Starting POST request for todo...');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    // Use a proper UUID for the current receptionist user
    const userid = body.userid || '00000000-0000-0000-0000-000000000001';

    const { title, description, priority, duedate } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    try {
      const db = await getDbConnection();
      console.log('Database connection successful for POST');
      
      // Ensure table exists before inserting
      const tableCheck = await db`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'todos'
        );
      `;
      
      if (!tableCheck[0].exists) {
        console.log('Creating todos table before insert...');
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
        
        await db`
          CREATE INDEX IF NOT EXISTS todos_workspace_idx ON todos(workspaceid);
        `;
        await db`
          CREATE INDEX IF NOT EXISTS todos_user_idx ON todos(userid);
        `;
      }

      const result = await db`
        INSERT INTO todos (
          workspaceid,
          userid,
          title,
          description,
          completed,
          priority,
          duedate
        ) VALUES (
          ${workspaceid}::uuid,
          ${userid},
          ${title},
          ${description || null},
          ${false},
          ${priority || 'medium'},
          ${duedate || null}
        )
        RETURNING *
      `;

      console.log('Created new todo:', result[0].todoid, 'for user:', userid);

      return NextResponse.json(result[0]);
      
    } catch (dbError) {
      console.error('Database error in POST:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('General error creating todo:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create todo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH - Update todo
export async function PATCH(request: NextRequest) {
  try {
    const db = await getDbConnection();
    const body = await request.json();

    const { todoid, title, description, completed, priority, duedate } = body;

    if (!todoid) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }

    const result = await db`
      UPDATE todos 
      SET 
        title = ${title},
        description = ${description},
        completed = ${completed},
        priority = ${priority},
        duedate = ${duedate},
        updatedat = NOW()
      WHERE todoid = ${todoid}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    console.log('Updated todo:', todoid);

    return NextResponse.json(result[0]);

  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update todo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete todo
export async function DELETE(request: NextRequest) {
  try {
    const db = await getDbConnection();
    const searchParams = request.nextUrl.searchParams;
    const todoid = searchParams.get('todoid');

    if (!todoid) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }

    const result = await db`
      DELETE FROM todos
      WHERE todoid = ${todoid}
      RETURNING todoid
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    console.log('Deleted todo:', todoid);

    return NextResponse.json({ 
      success: true,
      todoid: result[0].todoid
    });

  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete todo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
