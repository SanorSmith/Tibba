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

// GET - Fetch all todos
export async function GET(request: NextRequest) {
  try {
    const db = await getDbConnection();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    console.log('Fetching todos from database...');

    let query = `
      SELECT 
        todoid,
        title,
        description,
        priority,
        status,
        duedate,
        createdat,
        updatedat,
        createdby,
        assignedto
      FROM todos
      WHERE 1=1
    `;

    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(`status = '${status}'`);
    }
    if (priority && priority !== 'all') {
      conditions.push(`priority = '${priority}'`);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY createdat DESC';

    const todos = await db.unsafe(query);

    console.log(`Found ${todos.length} todos`);

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

    const { title, description, priority, status, duedate, createdby, assignedto } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const result = await db`
      INSERT INTO todos (
        title,
        description,
        priority,
        status,
        duedate,
        createdby,
        assignedto
      ) VALUES (
        ${title},
        ${description || null},
        ${priority || 'medium'},
        ${status || 'pending'},
        ${duedate || null},
        ${createdby || null},
        ${assignedto || null}
      )
      RETURNING *
    `;

    console.log('Created new todo:', result[0].todoid);

    return NextResponse.json({ 
      success: true,
      todo: result[0]
    });

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

    const { todoid, title, description, priority, status, duedate, assignedto } = body;

    if (!todoid) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      );
    }

    const updates = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (duedate !== undefined) {
      updates.push(`duedate = $${paramIndex++}`);
      values.push(duedate);
    }
    if (assignedto !== undefined) {
      updates.push(`assignedto = $${paramIndex++}`);
      values.push(assignedto);
    }

    updates.push(`updatedat = NOW()`);

    const query = `
      UPDATE todos 
      SET ${updates.join(', ')}
      WHERE todoid = $${paramIndex}
      RETURNING *
    `;

    values.push(todoid);

    const result = await db.unsafe(query, values);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    console.log('Updated todo:', todoid);

    return NextResponse.json({ 
      success: true,
      todo: result[0]
    });

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
