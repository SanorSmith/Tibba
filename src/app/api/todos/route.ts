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
    const db = await getDbConnection();
    const searchParams = request.nextUrl.searchParams;
    const workspaceid = searchParams.get('workspaceid') || 'fa9fb036-a7eb-49af-890c-54406dad139d';
    
    // For now, use a mock user ID. In production, this should come from authentication/session
    const userid = searchParams.get('userid') || 'current-receptionist-user';

    console.log('Fetching todos from database for workspace:', workspaceid, 'user:', userid);

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

  } catch (error) {
    console.error('Error fetching todos:', error);
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
    const db = await getDbConnection();
    const body = await request.json();
    const workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
    const userid = body.userid || 'current-receptionist-user'; // This should come from session

    const { title, description, priority, duedate } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
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
        ${workspaceid},
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

  } catch (error) {
    console.error('Error creating todo:', error);
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
